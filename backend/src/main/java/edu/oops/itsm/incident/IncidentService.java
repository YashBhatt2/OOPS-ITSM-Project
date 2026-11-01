package edu.oops.itsm.incident;
import edu.oops.itsm.data.*;
import edu.oops.itsm.domain.*;
import edu.oops.itsm.security.CurrentUser;
import edu.oops.itsm.catalog.CatalogService;
import edu.oops.itsm.notification.IncidentChanged;
import jakarta.validation.constraints.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.context.ApplicationEventPublisher;
import java.time.*;
import java.util.*;
@Service @Transactional public class IncidentService {
    private final Store db;
    private final CurrentUser user;
    private final Clock clock;
    private final CatalogService catalog;
    private final ApplicationEventPublisher events;
    private final PriorityCalculator priority=new PriorityCalculator();
    private final edu.oops.itsm.sla.SlaService sla;
    public IncidentService(Store db,CurrentUser user,Clock clock,CatalogService catalog,ApplicationEventPublisher events,edu.oops.itsm.sla.SlaService sla) {
        this.db=db;
        this.user=user;
        this.clock=clock;
        this.catalog=catalog;
        this.events=events;
        this.sla=sla;
    }
    public record Create(@NotBlank @Size(max=200) String title,@NotBlank @Size(max=10000) String description,@NotNull UUID serviceId,@NotNull UUID categoryId,@Min(1) @Max(3) int impact,@Min(1) @Max(3) int urgency,@Positive Integer affectedUserCount) {
    }
    public record Edit(@Min(0) long version,@NotBlank @Size(max=200) String title,@NotBlank @Size(max=10000) String description) {
    }
    public record Action(@Min(0) long version,@Size(max=255) String note,@Size(max=255) String reason,@Size(max=10000) String details) {
    }
    public record Assign(@Min(0) long version,@NotNull UUID technicianId,@NotBlank String strategy,@NotBlank @Size(max=255) String reason) {
    }
    public record Override(@Min(0) long version,@NotNull Priority priority,@NotBlank @Size(max=255) String reason) {
    }
    public record CommentInput(@NotBlank @Size(max=10000) String body,@NotBlank String kind,@NotBlank String visibility,UUID replyToId) {
    }
    public record FeedbackInput(@Min(1) @Max(5) int rating,@Size(max=255) String text) {
    }
    public record LinkInput(@Min(0) long version,@NotNull UUID targetIncidentId,@NotBlank String type) {
    }
    public Incident visible(UUID id) {
        var a=user.get();
        var i=db.get(Incident.class,id);
        if(a.role!=Role.ADMIN && !(a.role==Role.EMPLOYEE && a.id.equals(i.reporterId)) && !(a.role==Role.TECHNICIAN && a.id.equals(i.assigneeId))) throw new DomainException("NOT_FOUND","Incident not found.");
        return i;
    }
    private Incident changing(UUID id,long version) {
        visible(id);
        var i=db.lock(Incident.class,id);
        i.checkVersion(version);
        return i;
    }
    public ServiceCycle cycle(Incident i) {
        return db.rows(ServiceCycle.class,"select c from ServiceCycle c where c.incidentId=:id and c.number=:number","id",i.id,"number",i.cycleNumber).getFirst();
    }
    private SlaPolicy latestPolicy(UUID service) {
        var rows=db.query(SlaPolicy.class,"select p from SlaPolicy p where p.serviceId=:id order by p.revision desc","id",service).setMaxResults(1).getResultList();
        if(rows.isEmpty()) throw new DomainException("MISSING_SLA_POLICY","Configure SLA targets for the affected service first.");
        return rows.getFirst();
    }
    private ServiceCycle openCycle(Incident i,String reason) {
        var c=new ServiceCycle();
        c.incidentId=i.id;
        c.number=i.cycleNumber;
        c.policyId=latestPolicy(i.serviceId).id;
        c.openedAt=i.cycleNumber==1?i.createdAt:clock.instant();
        c.reopenReason=reason;
        deadlines(i,c);
        db.add(c);
        return c;
    }
    private void deadlines(Incident i,ServiceCycle c) {
        var target=db.get(SlaPolicy.class,c.policyId).targets.get(i.effectivePriority);
        if(target==null) throw new DomainException("MISSING_SLA_POLICY","SLA priority target is missing.");
        c.responseDueAt=c.openedAt.plusSeconds(target.responseSeconds);
        c.resolutionDueAt=c.openedAt.plusSeconds(target.resolutionSeconds);
    }
    public void audit(Incident i,ServiceCycle c,UUID actor,String action,String before,String after,String description,boolean internal) {
        Audit entry=new Audit();
        entry.incidentId=i.id;
        entry.cycleId=c.id;
        entry.actorId=actor;
        entry.action=action;
        entry.previousValue=before;
        entry.newValue=after;
        entry.description=description;
        entry.internal=internal;
        entry.createdAt=clock.instant();
        db.add(entry);
    }
    private void changed(Incident i,ServiceCycle c,String action,String before,String detail) {
        audit(i,c,user.get().id,action,before,i.status.name(),detail,false);
        events.publishEvent(new IncidentChanged(i.id,action));
        i.updatedAt=clock.instant();
    }
    public Map<String,Object> create(Create r) {
        var actor=user.require(Role.EMPLOYEE);
        var service=db.get(ItService.class,r.serviceId());
        var category=db.get(Category.class,r.categoryId());
        if(!service.active || !category.active) throw new DomainException("INVALID_INPUT","Select an active service and category.");
        var i=new Incident();
        i.reference="INC-"+i.id.toString().toUpperCase(Locale.ROOT);
        i.reporterId=actor.id;
        i.serviceId=service.id;
        i.categoryId=category.id;
        i.title=r.title();
        i.description=r.description();
        i.impact=r.impact();
        i.urgency=r.urgency();
        i.criticality=service.criticality;
        i.affectedUserCount=r.affectedUserCount();
        i.calculatedPriority=priority.calculate(i.impact,i.urgency,i.criticality);
        i.effectivePriority=i.calculatedPriority;
        i.createdAt=clock.instant();
        i.updatedAt=i.createdAt;
        db.add(i);
        var c=openCycle(i,null);
        changed(i,c,"CREATED",null,"Report classified; priority calculated as "+i.calculatedPriority);
        db.flush();
        return view(i);
    }
    public Map<String,Object> get(UUID id) {
        return view(visible(id));
    }
    public Map<String,Object> view(Incident i) {
        var c=cycle(i);
        var m=new LinkedHashMap<String,Object>();
        m.put("id",i.id);
        m.put("reference",i.reference);
        m.put("title",i.title);
        m.put("description",i.description);
        m.put("reporterId",i.reporterId);
        m.put("serviceId",i.serviceId);
        m.put("categoryId",i.categoryId);
        m.put("impact",i.impact);
        m.put("urgency",i.urgency);
        m.put("affectedUserCount",i.affectedUserCount);
        m.put("status",i.status);
        m.put("calculatedPriority",i.calculatedPriority);
        m.put("effectivePriority",i.effectivePriority);
        m.put("assignedTechnicianId",i.assigneeId);
        m.put("cycleNumber",i.cycleNumber);
        m.put("responseDueAt",c.responseDueAt);
        m.put("resolutionDueAt",c.resolutionDueAt);
        m.put("acknowledgedAt",c.acknowledgedAt);
        m.put("resolvedAt",c.resolvedAt);
        m.put("closedAt",c.closedAt);
        m.put("createdAt",i.createdAt);
        m.put("updatedAt",i.updatedAt);
        m.put("version",i.version);
        var resolutions=db.rows(Resolution.class,"select r from Resolution r where r.cycleId=:id order by r.resolvedAt desc","id",c.id);
        m.put("resolutions",resolutions.stream().map(r -> Map.of("id",r.id,"details",r.details,"resolvedAt",r.resolvedAt,"outcome",r.outcome)).toList());
        return m;
    }
    public Map<String,Object> edit(UUID id,Edit r) {
        var i=changing(id,r.version());
        var a=user.get();
        if(a.role==Role.TECHNICIAN || i.status!=IncidentStatus.NEW) throw new DomainException("FORBIDDEN","Report text can only be edited before assignment.");
        var before=i.title+"\n"+i.description;
        i.title=r.title();
        i.description=r.description();
        audit(i,cycle(i),a.id,"REPORT_EDITED",before,i.title+"\n"+i.description,"Report text updated",false);
        i.updatedAt=clock.instant();
        db.flush();
        return view(i);
    }
    public Map<String,Object> action(UUID id,String name,Action r) {
        var i=changing(id,r.version());
        var a=user.get();
        var c=cycle(i);
        var before=i.status.name();
        var now=clock.instant();
        sla.check(c.id);
        Lifecycle.Action action=switch(name) {
            case "acknowledge"->Lifecycle.Action.ACKNOWLEDGE;
            case "start-investigation"->Lifecycle.Action.START;
            case "resolutions"->Lifecycle.Action.RESOLVE;
            case "verify"->Lifecycle.Action.VERIFY;
            case "reject-resolution"->Lifecycle.Action.REJECT;
            case "close"->Lifecycle.Action.CLOSE;
            case "reopen"->Lifecycle.Action.REOPEN;
            default->throw new DomainException("NOT_FOUND","Action not found.");
        }
        ;
        switch(action) {
            case ACKNOWLEDGE,START,RESOLVE -> {
                if(a.role!=Role.TECHNICIAN || !a.id.equals(i.assigneeId)) throw new DomainException("FORBIDDEN","Only the assigned technician can do this.");
            }
            case VERIFY,REJECT,CLOSE -> user.require(Role.ADMIN);
            case REOPEN -> {
                if(a.role!=Role.EMPLOYEE || !a.id.equals(i.reporterId)) throw new DomainException("FORBIDDEN","Only the reporter can reopen this incident.");
            }
            default -> throw new IllegalArgumentException("Unsupported action");
        }
        String detail=switch(action) {
            case RESOLVE -> required(r.details());
            case VERIFY,CLOSE -> required(r.note());
            case REJECT,REOPEN -> required(r.reason());
            default -> name;
        }
        ;
        i.transition(action,c.closedAt,now);
        switch(action) {
            case ACKNOWLEDGE -> {
                if(c.acknowledgedAt==null)c.acknowledgedAt=now;
            }
            case RESOLVE -> {
                c.resolvedAt=now;
                var resolution=new Resolution();
                resolution.cycleId=c.id;
                resolution.technicianId=a.id;
                resolution.details=detail;
                resolution.resolvedAt=now;
                db.add(resolution);
            }
            case VERIFY,REJECT -> {
                var resolution=db.rows(Resolution.class,"select r from Resolution r where r.cycleId=:id and r.outcome='PENDING'","id",c.id).getFirst();
                resolution.reviewedBy=a.id;
                resolution.reviewedAt=now;
                resolution.reviewNote=detail;
                resolution.outcome=action==Lifecycle.Action.VERIFY?"ACCEPTED":"REJECTED";
                if(action==Lifecycle.Action.VERIFY) {
                    c.verifiedAt=now;
                    c.verifiedBy=a.id;
                }
                else {
                    ensureCapacityOnReject(i);
                    c.resolvedAt=null;
                }
            }
            case CLOSE -> {
                c.closedAt=now;
                c.closedBy=a.id;
                c.closureNote=detail;
                endAssignment(i);
            }
            case REOPEN -> {
                i.cycleNumber++;
                i.assigneeId=null;
                i.overrideReason=null;
                i.criticality=db.get(ItService.class,i.serviceId).criticality;
                i.calculatedPriority=priority.calculate(i.impact,i.urgency,i.criticality);
                i.effectivePriority=i.calculatedPriority;
                c=openCycle(i,detail);
            }
            default -> {
            }
        }
        changed(i,c,action.name(),before,detail.length()>255?detail.substring(0,255):detail);
        db.flush();
        return view(i);
    }
    private void ensureCapacityOnReject(Incident i) {
        var technician=db.lock(Account.class,i.assigneeId);
        // The state is already IN_PROGRESS, so include this incident in the capacity count.
        if(!technician.active || workload(technician.id)>technician.capacity) throw new DomainException("CAPACITY_EXCEEDED","Assigned technician cannot accept reopened investigation. Increase capacity or resolve other work first.");
    }
    public static String required(String text) {
        if(text==null || text.isBlank())throw new DomainException("INVALID_INPUT","A reason or details are required.");
        return text;
    }
    private void endAssignment(Incident i) {
        for(var a:db.rows(Assignment.class,"select a from Assignment a where a.incidentId=:id and a.endedAt is null","id",i.id)) a.endedAt=clock.instant();
        db.flush();
    }
    public long workload(UUID technician) {
        return db.count("select count(i) from Incident i where i.assigneeId=:id and i.status in :statuses","id",technician,"statuses",List.of(IncidentStatus.ASSIGNED,IncidentStatus.ACKNOWLEDGED,IncidentStatus.IN_PROGRESS));
    }
    private TechnicianCandidate candidate(Account a) {
        return new TechnicianCandidate(a.id,a.active,a.available,a.capacity,workload(a.id),a.experienceMonths,a.skills);
    }
    public Map<String,Object> recommendations(UUID id,String mode) {
        user.require(Role.ADMIN);
        var i=visible(id);
        String selected=mode==null?catalog.strategy():mode;
        AssignmentStrategy strategy=switch(selected) {
            case "SKILL_FIRST"->new SkillFirstAssignment();
            case "LOAD_FIRST"->new LoadFirstAssignment();
            default->throw new DomainException("INVALID_INPUT","Unknown assignment strategy.");
        }
        ;
        var required=db.get(Category.class,i.categoryId).requirements;
        var candidates=db.rows(Account.class,"select a from Account a where a.role=:role","role",Role.TECHNICIAN).stream().map(this::candidate).toList();
        var ranked=strategy.rank(candidates,required);
        var views=new ArrayList<Map<String,Object>>();
        for(int n=0;n<ranked.size();n++) {
            var c=ranked.get(n);
            views.add(Map.of("technicianId",c.id(),"rank",n+1,"skillScore",c.skillScore(required),"activeWorkload",c.workload(),"capacity",c.capacity(),"reasons",List.of("Meets category skill requirements","Available capacity")));
        }
        return Map.of("strategy",selected,"incidentVersion",i.version,"candidates",views,"requiresConfirmation",true);
    }
    public Map<String,Object> assign(UUID id,Assign r) {
        var actor=user.require(Role.ADMIN);
        var i=changing(id,r.version());
        if(!List.of("SKILL_FIRST","LOAD_FIRST","MANUAL").contains(r.strategy()))throw new DomainException("INVALID_INPUT","Unknown assignment strategy.");
        if(r.technicianId().equals(i.assigneeId))throw new DomainException("CONFLICT","Technician is already assigned.");
        var a=db.lock(Account.class,r.technicianId());
        var required=db.get(Category.class,i.categoryId).requirements;
        if(a.role!=Role.TECHNICIAN || !candidate(a).eligible(required))throw new DomainException("NO_ELIGIBLE_TECHNICIAN","Technician is unavailable, lacks required skills, or is at capacity.");
        String before=i.status.name();
        i.transition(Lifecycle.Action.ASSIGN,null,clock.instant());
        endAssignment(i);
        i.assigneeId=a.id;
        var c=cycle(i);
        var assignment=new Assignment();
        assignment.incidentId=i.id;
        assignment.cycleId=c.id;
        assignment.technicianId=a.id;
        assignment.assignedBy=actor.id;
        assignment.strategy=r.strategy();
        assignment.reason=r.reason();
        assignment.assignedAt=clock.instant();
        db.add(assignment);
        changed(i,c,"ASSIGNED",before,"Assigned technician "+a.id+" using "+r.strategy()+": "+r.reason());
        db.flush();
        return view(i);
    }
    public Map<String,Object> override(UUID id,Override r) {
        user.require(Role.ADMIN);
        var i=changing(id,r.version());
        return setPriority(i,r.priority(),r.reason());
    }
    public Map<String,Object> resetPriority(UUID id,Action r) {
        user.require(Role.ADMIN);
        var i=changing(id,r.version());
        required(r.reason());
        return setPriority(i,i.calculatedPriority,null);
    }
    private Map<String,Object> setPriority(Incident i,Priority value,String reason) {
        if(!i.status.active())throw new DomainException("INVALID_TRANSITION","Priority can only change during active investigation.");
        var c=cycle(i);
        sla.check(c.id);
        var old=i.effectivePriority;
        i.effectivePriority=value;
        i.overrideReason=reason;
        c.deadlineRevision++;
        deadlines(i,c);
        i.updatedAt=clock.instant();
        audit(i,c,user.get().id,"PRIORITY_CHANGED",old.name(),value.name(),reason==null?"Override reset":reason,false);
        events.publishEvent(new IncidentChanged(i.id,"PRIORITY_CHANGED"));
        db.flush();
        return view(i);
    }
    public List<Map<String,Object>> comments(UUID id) {
        visible(id);
        boolean employee=user.get().role==Role.EMPLOYEE;
        return db.rows(Comment.class,"select c from Comment c where c.incidentId=:id"+(employee?" and c.visibility='PUBLIC'":"")+" order by c.createdAt","id",id).stream().map(c -> {
            var m=new LinkedHashMap<String,Object>();m.put("id",c.id);m.put("authorId",c.authorId);m.put("body",c.body);m.put("kind",c.kind);m.put("visibility",c.visibility);m.put("replyToId",c.replyToId);m.put("createdAt",c.createdAt);return (Map<String,Object>)m;
        }
        ).toList();
    }
    public Map<String,Object> comment(UUID id,CommentInput r) {
        var i=visible(id);
        var a=user.get();
        if(!i.status.active())throw new DomainException("INVALID_TRANSITION","Comments require an active incident.");
        if(!List.of("NOTE","INFORMATION_REQUEST","REPLY").contains(r.kind()) || !List.of("PUBLIC","INTERNAL").contains(r.visibility()))throw new DomainException("INVALID_INPUT","Unknown comment kind or visibility.");
        if(a.role==Role.EMPLOYEE && (!r.visibility().equals("PUBLIC") || r.kind().equals("INFORMATION_REQUEST")))throw new DomainException("FORBIDDEN","Employees may add public notes and replies only.");
        if(r.replyToId()!=null) {
            var parent=db.get(Comment.class,r.replyToId());
            if(!parent.incidentId.equals(id) || (a.role==Role.EMPLOYEE && !parent.visibility.equals("PUBLIC")))throw new DomainException("NOT_FOUND","Parent comment not found.");
        }
        var c=new Comment();
        c.incidentId=id;
        c.authorId=a.id;
        c.body=r.body();
        c.kind=r.kind();
        c.visibility=r.visibility();
        c.replyToId=r.replyToId();
        c.createdAt=clock.instant();
        db.add(c);
        audit(i,cycle(i),a.id,"COMMENT_ADDED",null,c.id.toString(),"Comment added",r.visibility().equals("INTERNAL"));
        return Map.of("id",c.id);
    }
    public List<Map<String,Object>> history(UUID id) {
        visible(id);
        boolean employee=user.get().role==Role.EMPLOYEE;
        return db.rows(Audit.class,"select a from Audit a where a.incidentId=:id"+(employee?" and a.internal=false":"")+" order by a.createdAt","id",id).stream().map(a -> {
            var m=new LinkedHashMap<String,Object>();m.put("id",a.id);m.put("action",a.action);m.put("createdAt",a.createdAt);m.put("description",a.description);if(!employee) {
                m.put("actorId",a.actorId);m.put("previousValue",a.previousValue);m.put("newValue",a.newValue);m.put("cycleId",a.cycleId);
            }
            return (Map<String,Object>)m;
        }
        ).toList();
    }
    public Map<String,Object> feedback(UUID id,FeedbackInput r) {
        var i=visible(id);
        var a=user.require(Role.EMPLOYEE);
        if(i.status.active())throw new DomainException("INVALID_TRANSITION","Feedback requires a resolution.");
        var f=new Feedback();
        f.cycleId=cycle(i).id;
        f.reporterId=a.id;
        f.rating=r.rating();
        f.text=r.text();
        f.createdAt=clock.instant();
        db.add(f);
        return Map.of("id",f.id);
    }
    public Map<String,Object> link(UUID id,LinkInput r) {
        var actor=user.require(Role.ADMIN);
        db.lock(Setting.class,UUID.fromString("00000000-0000-4000-8000-000000000001"));
        var i=changing(id,r.version());
        var other=db.get(Incident.class,r.targetIncidentId());
        if(i.id.equals(other.id)||!List.of("RELATED","DUPLICATE").contains(r.type()))throw new DomainException("INVALID_INPUT","Invalid incident relationship.");
        if(r.type().equals("DUPLICATE")) {
            var seen=new HashSet<UUID>();
            var pending=new ArrayDeque<UUID>();
            pending.add(other.id);
            while(!pending.isEmpty()) {
                var next=pending.remove();
                if(next.equals(i.id))throw new DomainException("CONFLICT","Duplicate relationships cannot form a cycle.");
                if(seen.add(next))db.rows(IncidentLink.class,"select l from IncidentLink l where l.sourceId=:id and l.type='DUPLICATE'","id",next).forEach(l->pending.add(l.targetId));
            }
        }
        var l=new IncidentLink();
        l.sourceId=i.id;
        l.targetId=other.id;
        l.type=r.type();
        if(l.type.equals("RELATED") && l.sourceId.compareTo(l.targetId)>0) {
            l.sourceId=other.id;
            l.targetId=i.id;
        }
        l.confirmedBy=actor.id;
        l.confirmedAt=clock.instant();
        db.add(l);
        audit(i,cycle(i),actor.id,"RELATIONSHIP_CONFIRMED",null,other.id.toString(),"Incident relationship confirmed",true);
        i.updatedAt=clock.instant();
        return Map.of("id",l.id);
    }
    public record Classification(@Min(0) long version,@NotNull UUID serviceId,@NotNull UUID categoryId,@Min(1) @Max(3) int impact,@Min(1) @Max(3) int urgency,@NotBlank @Size(max=255) String reason) {
    }
    public Map<String,Object> classify(UUID id,Classification r) {
        var actor=user.require(Role.ADMIN);
        var i=changing(id,r.version());
        if(i.status!=IncidentStatus.NEW)throw new DomainException("INVALID_TRANSITION","Correct classification before assigning the incident.");
        var service=db.get(ItService.class,r.serviceId());
        var category=db.get(Category.class,r.categoryId());
        if(!service.active||!category.active)throw new DomainException("INVALID_INPUT","Choose active catalog records.");
        var c=cycle(i);
        sla.check(c.id);
        String before=i.serviceId+"/"+i.categoryId+"/"+i.impact+"/"+i.urgency;
        i.serviceId=service.id;
        i.categoryId=category.id;
        i.impact=r.impact();
        i.urgency=r.urgency();
        i.criticality=service.criticality;
        i.calculatedPriority=priority.calculate(i.impact,i.urgency,i.criticality);
        if(i.overrideReason==null)i.effectivePriority=i.calculatedPriority;
        c.policyId=latestPolicy(service.id).id;
        c.deadlineRevision++;
        deadlines(i,c);
        i.updatedAt=clock.instant();
        audit(i,c,actor.id,"CLASSIFICATION_CHANGED",before,i.serviceId+"/"+i.categoryId+"/"+i.impact+"/"+i.urgency,r.reason(),false);
        db.flush();
        return view(i);
    }
    public Map<String,Object> recalculate(UUID id,Action r) {
        user.require(Role.ADMIN);
        var i=changing(id,r.version());
        required(r.reason());
        if(!i.status.active())throw new DomainException("INVALID_TRANSITION","Recalculation requires an active incident.");
        var connected=new HashSet<UUID>();
        connected.add(i.id);
        var links=db.rows(IncidentLink.class,"select l from IncidentLink l where l.sourceId=:id or l.targetId=:id","id",i.id);
        links.forEach(l-> {
            connected.add(l.sourceId);connected.add(l.targetId);
        }
        );
        long reporters=db.count("select count(distinct i.reporterId) from Incident i where i.id in :ids and i.serviceId=:service and i.createdAt>=:since and i.status in :states","ids",connected,"service",i.serviceId,"since",clock.instant().minus(Duration.ofHours(24)),"states",List.of(IncidentStatus.NEW,IncidentStatus.ASSIGNED,IncidentStatus.ACKNOWLEDGED,IncidentStatus.IN_PROGRESS));
        var before=i.calculatedPriority;
        i.calculatedPriority=priority.withRelatedReports(priority.calculate(i.impact,i.urgency,i.criticality),reporters);
        audit(i,cycle(i),user.get().id,"PRIORITY_RECALCULATED",before.name(),i.calculatedPriority.name(),r.reason(),false);
        i.updatedAt=clock.instant();
        if(i.overrideReason==null)return setPriority(i,i.calculatedPriority,null);
        db.flush();
        return view(i);
    }
}
