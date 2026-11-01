package edu.oops.itsm.data;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.*;
import edu.oops.itsm.domain.*;
@Entity @Table(name="assignment") public class Assignment {
    @Id public UUID id = UUID.randomUUID();
    public UUID incidentId;
    public UUID cycleId;
    public UUID technicianId;
    public UUID assignedBy;
    public String strategy;
    public String reason;
    public Instant assignedAt;
    public Instant endedAt;
}
