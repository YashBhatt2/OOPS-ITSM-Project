package edu.oops.itsm.data;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.*;
import edu.oops.itsm.domain.*;
@Entity @Table(name="incident") public class Incident {
    @Id public UUID id = UUID.randomUUID();
    public String reference;
    public UUID reporterId;
    public UUID serviceId;
    public UUID categoryId;
    public String title;
    @Column(length=10000) public String description;
    public int impact;
    public int urgency;
    public int criticality;
    public Integer affectedUserCount;
    @Enumerated(EnumType.STRING) public IncidentStatus status = IncidentStatus.NEW;
    @Enumerated(EnumType.STRING) public Priority calculatedPriority;
    @Enumerated(EnumType.STRING) public Priority effectivePriority;
    public String overrideReason;
    public UUID assigneeId;
    public int cycleNumber = 1;
    public Instant createdAt;
    public Instant updatedAt;
    @Version public long version;
    public void transition(Lifecycle.Action action, Instant closedAt, Instant now) {
        status = new Lifecycle().transition(status, action, closedAt, now);
        updatedAt = now;
    }
    public void checkVersion(long expected) {
        if (version != expected) throw new DomainException("STALE_VERSION", "Reload the incident before changing it.");
    }
}
