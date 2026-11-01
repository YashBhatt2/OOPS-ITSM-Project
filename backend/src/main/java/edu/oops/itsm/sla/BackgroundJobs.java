package edu.oops.itsm.sla;
import edu.oops.itsm.data.*;
import edu.oops.itsm.notification.NotificationService;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.*;
import org.slf4j.LoggerFactory;
import java.util.UUID;
@Configuration @EnableScheduling @ConditionalOnProperty(name="itsm.scheduling.enabled",havingValue="true",matchIfMissing=true) public class BackgroundJobs {
    private final Store db;
    private final SlaService sla;
    private final NotificationService notifications;
    public BackgroundJobs(Store db,SlaService sla,NotificationService notifications) {
        this.db=db;
        this.sla=sla;
        this.notifications=notifications;
    }
    @Scheduled(fixedDelayString="${itsm.sla.poll-ms:30000}") public void monitor() {
        for(var id:db.rows(UUID.class,"select c.id from ServiceCycle c"))try {
            sla.check(id);
        }
        catch(Exception e) {
            LoggerFactory.getLogger(getClass()).warn("SLA check failed for cycle {}: {}",id,e.getClass().getSimpleName());
        }
    }
    @Scheduled(fixedDelay=10000) public void email() {
        for(var id:db.query(UUID.class,"select n.id from Notification n where n.emailDelivered=false order by n.createdAt").setMaxResults(100).getResultList())try {
            notifications.deliver(id);
        }
        catch(Exception e) {
            LoggerFactory.getLogger(getClass()).warn("Email delivery failed for notification {}",id);
        }
    }
}
