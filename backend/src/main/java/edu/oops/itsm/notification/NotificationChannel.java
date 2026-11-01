package edu.oops.itsm.notification;
import edu.oops.itsm.data.Notification;
public interface NotificationChannel {
    void deliver(Notification notification);
}
