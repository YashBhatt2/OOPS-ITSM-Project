package edu.oops.itsm.notification;
import edu.oops.itsm.data.Notification;
import org.slf4j.LoggerFactory;
public final class SimulatedEmailChannel implements NotificationChannel {
    public void deliver(Notification n) {
        LoggerFactory.getLogger(getClass()).info("Simulated email delivery: notification={}, recipient={}",n.id,n.recipientId);
    }
}
