package edu.oops.itsm.notification;
import edu.oops.itsm.data.*;
import edu.oops.itsm.domain.*;
import edu.oops.itsm.security.CurrentUser;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Clock;
import java.util.*;
@Service @Transactional public class NotificationService {
    private final Store db;
    private final Clock clock;
    private final CurrentUser user;
    public NotificationService(Store db,Clock clock,CurrentUser user) {
        this.db=db;
        this.clock=clock;
        this.user=user;
    }
    @EventListener public void changed(IncidentChanged event) {
        var i=db.get(Incident.class,event.incidentId());
        var recipients=new HashSet<UUID>();
        recipients.add(i.reporterId);
        if(i.assigneeId!=null)recipients.add(i.assigneeId);
        db.rows(Account.class,"select a from Account a where a.role=:role and a.active=true","role",Role.ADMIN).forEach(a->recipients.add(a.id));
        for(var id:recipients) {
            var n=new Notification();
            n.recipientId=id;
            n.incidentId=i.id;
            n.message=i.reference+": "+event.action();
            n.createdAt=clock.instant();
            db.add(n);
        }
    }
    public Object list(int page,int size) {
        var a=user.get();
        if(page<0||size<1||size>100||(long)page*size>Integer.MAX_VALUE)throw new DomainException("INVALID_INPUT","Invalid page/size.");
        var rows=db.query(Notification.class,"select n from Notification n where n.recipientId=:id order by n.createdAt desc,n.id","id",a.id).setFirstResult(page*size).setMaxResults(size).getResultList();
        long total=db.count("select count(n) from Notification n where n.recipientId=:id","id",a.id);
        return Map.of("items",rows.stream().map(n -> {
            var m=new LinkedHashMap<String,Object>();m.put("id",n.id);m.put("incidentId",n.incidentId);m.put("message",n.message);m.put("createdAt",n.createdAt);m.put("readAt",n.readAt);m.put("emailDelivered",n.emailDelivered);return m;
        }
        ).toList(),"page",page,"size",size,"totalElements",total,"totalPages",(total+size-1)/size);
    }
    public void read(UUID id) {
        var n=db.get(Notification.class,id);
        if(!n.recipientId.equals(user.get().id))throw new DomainException("NOT_FOUND","Notification not found.");
        if(n.readAt==null)n.readAt=clock.instant();
    }
    public void deliver(UUID id) {
        var n=db.lock(Notification.class,id);
        if(n.emailDelivered)return;
        n.emailAttempts++;
        new SimulatedEmailChannel().deliver(n);
        n.emailDelivered=true;
        n.emailDeliveredAt=clock.instant();
    }
}
