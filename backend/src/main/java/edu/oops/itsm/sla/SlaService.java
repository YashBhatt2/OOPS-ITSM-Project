package edu.oops.itsm.sla;
import edu.oops.itsm.data.*;
import edu.oops.itsm.domain.SlaRules;
import edu.oops.itsm.notification.IncidentChanged;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.util.UUID;
@Service @Transactional public class SlaService {
    private final Store db;
    private final Clock clock;
    private final ApplicationEventPublisher events;
    public SlaService(Store db,Clock clock,ApplicationEventPublisher events) {
        this.db=db;
        this.clock=clock;
        this.events=events;
    }
    public void check(UUID cycleId) {
        var c=db.lock(ServiceCycle.class,cycleId);
        checkTarget(c,"RESPONSE",c.responseDueAt,c.acknowledgedAt);
        checkTarget(c,"RESOLUTION",c.resolutionDueAt,c.resolvedAt);
    }
    private void checkTarget(ServiceCycle c,String target,Instant due,Instant completed) {
        var assessment=new SlaRules().assess(c.openedAt,due,completed,clock.instant());
        if(assessment==SlaRules.Assessment.BREACHED) {
            record(c,target,"VIOLATION",due);
            record(c,target,"ESCALATION",due);
        }
        else if(assessment==SlaRules.Assessment.AT_RISK)record(c,target,"WARNING",clock.instant());
    }
    private void record(ServiceCycle c,String target,String type,Instant occurred) {
        if(db.count("select count(e) from SlaEvent e where e.cycleId=:id and e.target=:target and e.eventType=:type and e.deadlineRevision=:revision","id",c.id,"target",target,"type",type,"revision",c.deadlineRevision)>0)return;
        var e=new SlaEvent();
        e.cycleId=c.id;
        e.target=target;
        e.eventType=type;
        e.deadlineRevision=c.deadlineRevision;
        e.occurredAt=occurred;
        e.detectedAt=clock.instant();
        db.add(e);
        var audit=new Audit();
        audit.incidentId=c.incidentId;
        audit.cycleId=c.id;
        audit.action="SLA_"+type;
        audit.description=target+" SLA "+type;
        audit.createdAt=clock.instant();
        db.add(audit);
        events.publishEvent(new IncidentChanged(c.incidentId,"SLA_"+target+"_"+type));
    }
}
