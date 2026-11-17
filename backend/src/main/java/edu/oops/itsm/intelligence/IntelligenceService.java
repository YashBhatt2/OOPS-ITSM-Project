package edu.oops.itsm.intelligence;
import edu.oops.itsm.data.*;
import edu.oops.itsm.domain.*;
import edu.oops.itsm.security.CurrentUser;
import edu.oops.itsm.incident.IncidentService;
import jakarta.validation.constraints.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.util.*;
@Service @Transactional(readOnly=true) public class IntelligenceService {
    public record Draft(@NotBlank @Size(max=200) String title,@NotBlank @Size(max=10000) String description,@NotNull UUID serviceId,@NotNull UUID categoryId) {
    }
    private final Store db;
    private final CurrentUser user;
    private final IntelligenceClient client;
    private final IncidentService incidents;
    private final Clock clock;
    public IntelligenceService(Store db,CurrentUser user,IntelligenceClient client,IncidentService incidents,Clock clock) {
        this.db=db;
        this.user=user;
        this.client=client;
        this.incidents=incidents;
        this.clock=clock;
    }
    public Object duplicates(Draft r) {
        var actor=user.get();
        db.get(ItService.class,r.serviceId());
        db.get(Category.class,r.categoryId());
        var rows=db.query(Incident.class,"select i from Incident i where i.serviceId=:service and i.createdAt>=:since and i.status in :states order by i.createdAt desc","service",r.serviceId(),"since",clock.instant().minus(Duration.ofDays(7)),"states",List.of(IncidentStatus.NEW,IncidentStatus.ASSIGNED,IncidentStatus.ACKNOWLEDGED,IncidentStatus.IN_PROGRESS)).setMaxResults(100).getResultList();
        var result=client.rank("duplicates",query(r.title(),r.description(),r.serviceId(),r.categoryId()),rows.stream().map(this::candidate).toList());
        if(actor.role==Role.EMPLOYEE)return Map.of("status","AVAILABLE","suggestions",result.results().stream().map(m->Map.of("message","A similar report exists for this service.","similarityScore",m.similarityScore())).toList());
        // Only admins receive cross-incident identifiers; technicians receive generic notices for unassigned tickets.
        if(actor.role==Role.TECHNICIAN)return Map.of("status","AVAILABLE","suggestions",result.results().stream().map(m->Map.of("message","A similar report exists for this service.","similarityScore",m.similarityScore())).toList());
        return Map.of("status","AVAILABLE","modelVersion",result.modelVersion(),"suggestions",result.results());
    }
    public Object resolutions(UUID id) {
        var actor=user.get();
        if(actor.role==Role.EMPLOYEE)throw new DomainException("FORBIDDEN","Resolution suggestions are for support staff.");
        var incident=incidents.visible(id);
        // Exclude the incident itself: a closed incident would otherwise match its own resolution.
        var args=new ArrayList<Object>(List.of("service",incident.serviceId,"category",incident.categoryId,"closed",IncidentStatus.CLOSED,"self",incident.id));
        String restriction="";
        if(actor.role==Role.TECHNICIAN) {
            restriction=" and i.assigneeId=:actor";
            args.add("actor");
            args.add(actor.id);
        }
        var rows=db.query(Incident.class,"select i from Incident i where i.serviceId=:service and i.categoryId=:category and i.status=:closed and i.id<>:self"+restriction+" order by i.createdAt desc",args.toArray()).setMaxResults(100).getResultList();
        var candidates=new ArrayList<Map<String,Object>>();
        var text=new HashMap<UUID,String>();
        for(var i:rows) {
            var c=incidents.cycle(i);
            var accepted=db.query(Resolution.class,"select r from Resolution r where r.cycleId=:id and r.outcome='ACCEPTED' order by r.resolvedAt desc","id",c.id).setMaxResults(1).getResultList();
            if(!accepted.isEmpty()) {
                var m=new LinkedHashMap<>(candidate(i));
                m.put("resolutionText",accepted.getFirst().details);
                candidates.add(m);
                text.put(i.id,accepted.getFirst().details);
            }
        }
        var result=client.rank("resolutions",query(incident.title,incident.description,incident.serviceId,incident.categoryId),candidates);
        return Map.of("status","AVAILABLE","modelVersion",result.modelVersion(),"suggestions",result.results().stream().map(m->Map.of("incidentId",m.incidentId(),"similarityScore",m.similarityScore(),"resolutionText",text.get(m.incidentId()))).toList());
    }
    private Map<String,Object> query(String title,String description,UUID service,UUID category) {
        return Map.of("title",title,"description",description,"serviceId",service,"categoryId",category);
    }
    private Map<String,Object> candidate(Incident i) {
        var m=new LinkedHashMap<>(query(i.title,i.description,i.serviceId,i.categoryId));
        m.put("incidentId",i.id);
        return m;
    }
}
