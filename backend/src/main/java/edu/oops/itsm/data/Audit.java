package edu.oops.itsm.data;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.*;
import edu.oops.itsm.domain.*;
@Entity @Table(name="audit_entry") public class Audit {
    @Id public UUID id = UUID.randomUUID();
    public UUID incidentId;
    public UUID cycleId;
    public UUID actorId;
    public String action;
    @Column(length=20000) public String previousValue;
    @Column(length=20000) public String newValue;
    @Column(length=10000) public String description;
    public boolean internal;
    public Instant createdAt;
}
