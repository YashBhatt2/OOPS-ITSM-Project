package edu.oops.itsm.data;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.*;
import edu.oops.itsm.domain.*;
@Entity @Table(name="notification") public class Notification {
    @Id public UUID id = UUID.randomUUID();
    public UUID recipientId;
    public UUID incidentId;
    public String message;
    public Instant createdAt;
    public Instant readAt;
    public boolean emailDelivered;
    public int emailAttempts;
    public Instant emailDeliveredAt;
}
