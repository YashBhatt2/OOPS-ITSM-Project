package edu.oops.itsm.incident;
import edu.oops.itsm.data.*;
import edu.oops.itsm.domain.*;
import edu.oops.itsm.security.CurrentUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.util.*;
@Service @Transactional(readOnly=true) public class IncidentQueries {
    private final Store db;
    private final CurrentUser user;
    private final IncidentService incidents;
    private final Clock clock;
    public IncidentQueries(Store db,CurrentUser user,IncidentService incidents,Clock clock) {
        this.db=db;
        this.user=user;
        this.incidents=incidents;
        this.clock=clock;
    }
    public Map<String,Object> list(Map<String,String> filters) {
        var actor=user.get();
        StringBuilder where=new StringBuilder(" where 1=1");
        List<Object> args=new ArrayList<>();
        if(actor.role==Role.EMPLOYEE)add(where,args,"i.reporterId=:viewer","viewer",actor.id);
        if(actor.role==Role.TECHNICIAN)add(where,args,"i.assigneeId=:viewer","viewer",actor.id);
        Set<String> accepted=Set.of("page","size","sort","status","priority","categoryId","serviceId","technicianId","id","reference","createdFrom","createdTo","slaStatus","includeClosed");
        if(!accepted.containsAll(filters.keySet()))throw new DomainException("INVALID_INPUT","Unknown filter.");
        for(var e:filters.entrySet()) {
            String k=e.getKey(),v=e.getValue();
            switch(k) {
                case "status" -> add(where,args,"i.status=:status",k,IncidentStatus.valueOf(v));
                case "priority" -> add(where,args,"i.effectivePriority=:priority",k,Priority.valueOf(v));
                case "categoryId","serviceId","id" -> add(where,args,"i."+k+"=:"+k,k,UUID.fromString(v));
                case "technicianId" -> add(where,args,"i.assigneeId=:technicianId",k,UUID.fromString(v));
                case "reference" -> add(where,args,"i.reference=:reference",k,v);
                case "createdFrom" -> add(where,args,"i.createdAt>=:createdFrom",k,Instant.parse(v));
                case "createdTo" -> add(where,args,"i.createdAt<:createdTo",k,Instant.parse(v));
                case "slaStatus" -> {
                    if(!Set.of("ON_TRACK","AT_RISK","BREACHED").contains(v))throw new DomainException("INVALID_INPUT","Unknown SLA status.");
                    // Warning boundary uses the same four-fifths elapsed rule as the scheduler.
                    String breach="(exists (select e.id from SlaEvent e where e.cycleId=c.id and e.eventType='VIOLATION') or (c.acknowledgedAt is null and c.responseDueAt<:now) or c.acknowledgedAt>c.responseDueAt or (c.resolvedAt is null and c.resolutionDueAt<:now) or c.resolvedAt>c.resolutionDueAt)";
                    String risk="exists (select e.id from SlaEvent e where e.cycleId=c.id and e.eventType='WARNING' and e.deadlineRevision=c.deadlineRevision and ((e.target='RESPONSE' and c.acknowledgedAt is null) or (e.target='RESOLUTION' and c.resolvedAt is null)))";
                    String predicate=v.equals("BREACHED")?breach:v.equals("AT_RISK")?"not "+breach+" and "+risk:"not "+breach+" and not "+risk;
                    add(where,args,"exists (select c.id from ServiceCycle c where c.incidentId=i.id and c.number=i.cycleNumber and "+predicate+")","now",clock.instant());
                }
                default -> {
                }
            }
        }
        if(!filters.containsKey("status") && !Boolean.parseBoolean(filters.getOrDefault("includeClosed","false")))where.append(" and i.status<>edu.oops.itsm.domain.IncidentStatus.CLOSED");
        int page=Integer.parseInt(filters.getOrDefault("page","0")),size=Integer.parseInt(filters.getOrDefault("size","20"));
        if(page<0 || size<1 || size>100 || (long)page*size>Integer.MAX_VALUE)throw new DomainException("INVALID_INPUT","Invalid page or size (1–100).");
        var sort=filters.getOrDefault("sort","createdAt,desc").split(",");
        if(sort.length!=2 || !Set.of("createdAt","updatedAt","reference").contains(sort[0]) || !Set.of("asc","desc").contains(sort[1]))throw new DomainException("INVALID_INPUT","Unsupported sort.");
        long total=db.count("select count(i) from Incident i"+where,args.toArray());
        var rows=db.query(Incident.class,"select i from Incident i"+where+" order by i."+sort[0]+" "+sort[1]+", i.id",args.toArray()).setFirstResult(page*size).setMaxResults(size).getResultList();
        return Map.of("items",rows.stream().map(incidents::view).toList(),"page",page,"size",size,"totalElements",total,"totalPages",(total+size-1)/size);
    }
    private void add(StringBuilder where,List<Object> args,String expression,String name,Object value) {
        where.append(" and ").append(expression);
        args.add(name);
        args.add(value);
    }
    public Map<String,Object> dashboard() {
        var a=user.get();
        String scope=a.role==Role.ADMIN?"":a.role==Role.EMPLOYEE?" and i.reporterId=:viewer":" and i.assigneeId=:viewer";
        Object[] args=a.role==Role.ADMIN?new Object[] {
        }
        :new Object[] {
            "viewer",a.id
        }
        ;
        var counts=new LinkedHashMap<String,Long>();
        for(var s:IncidentStatus.values()) {
            var more=new ArrayList<Object>(Arrays.asList(args));
            more.add("status");
            more.add(s);
            counts.put(s.name(),db.count("select count(i) from Incident i where i.status=:status"+scope,more.toArray()));
        }
        return Map.of("role",a.role,"byStatus",counts,"activeWorkload",counts.get("ASSIGNED")+counts.get("ACKNOWLEDGED")+counts.get("IN_PROGRESS"),"capacity",a.role==Role.TECHNICIAN?a.capacity:0,"unreadNotifications",db.count("select count(n) from Notification n where n.recipientId=:id and n.readAt is null","id",a.id));
    }
    public Object report(String kind,Instant from,Instant to) {
        user.require(Role.ADMIN);
        var args=new ArrayList<Object>();
        String where=" where 1=1";
        if(from!=null) {
            where+=" and i.createdAt>=:from";
            args.add("from");
            args.add(from);
        }
        if(to!=null) {
            where+=" and i.createdAt<:to";
            args.add("to");
            args.add(to);
        }
        if(from!=null && to!=null && !from.isBefore(to))throw new DomainException("INVALID_INPUT","Date range must be increasing.");
        return switch(kind) {
            case "overview" -> Map.of("total",db.count("select count(i) from Incident i"+where,args.toArray()),"byStatus",db.rows(Object[].class,"select i.status,count(i) from Incident i"+where+" group by i.status",args.toArray()).stream().map(r->Map.of("status",r[0],"count",r[1])).toList(),"historicallyBreachedIncidents",db.count("select count(i) from Incident i"+where+" and exists (select e.id from SlaEvent e, ServiceCycle c where e.cycleId=c.id and c.incidentId=i.id and e.eventType='VIOLATION')",args.toArray()));
            case "services" -> db.rows(Object[].class,"select i.serviceId,count(i) from Incident i"+where+" group by i.serviceId",args.toArray()).stream().map(r->Map.of("serviceId",r[0],"count",r[1])).toList();
            case "technician-workload" -> db.rows(Account.class,"select a from Account a where a.role=:role","role",Role.TECHNICIAN).stream().map(a->Map.of("technicianId",a.id,"displayName",a.displayName,"activeWorkload",incidents.workload(a.id),"capacity",a.capacity)).toList();
            default -> throw new DomainException("NOT_FOUND","Report not found.");
        }
        ;
    }
}
