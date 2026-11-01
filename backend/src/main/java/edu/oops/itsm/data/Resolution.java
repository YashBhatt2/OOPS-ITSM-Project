package edu.oops.itsm.data;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.*;
import edu.oops.itsm.domain.*;
@Entity @Table(name="resolution_attempt") public class Resolution {
    @Id public UUID id = UUID.randomUUID();
    public UUID cycleId;
    public UUID technicianId;
    @Column(length=10000) public String details;
    public Instant resolvedAt;
    public String outcome = "PENDING";
    public UUID reviewedBy;
    public Instant reviewedAt;
    public String reviewNote;
}
