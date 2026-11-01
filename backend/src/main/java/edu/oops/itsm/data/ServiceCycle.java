package edu.oops.itsm.data;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.*;
import edu.oops.itsm.domain.*;
@Entity @Table(name="service_cycle") public class ServiceCycle {
    @Id public UUID id = UUID.randomUUID();
    public UUID incidentId;
    public int number;
    public UUID policyId;
    public Instant openedAt;
    public Instant responseDueAt;
    public Instant resolutionDueAt;
    public Instant acknowledgedAt;
    public Instant resolvedAt;
    public Instant verifiedAt;
    public UUID verifiedBy;
    public Instant closedAt;
    public UUID closedBy;
    public String closureNote;
    public String reopenReason;
    public int deadlineRevision;
}
