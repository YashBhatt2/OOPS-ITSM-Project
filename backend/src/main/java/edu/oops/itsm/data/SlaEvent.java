package edu.oops.itsm.data;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.*;
import edu.oops.itsm.domain.*;
@Entity @Table(name="sla_event") public class SlaEvent {
    @Id public UUID id = UUID.randomUUID();
    public UUID cycleId;
    public String target;
    public String eventType;
    public int deadlineRevision;
    public Instant occurredAt;
    public Instant detectedAt;
}
