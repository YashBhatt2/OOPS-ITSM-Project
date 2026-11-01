package edu.oops.itsm.data;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.*;
import edu.oops.itsm.domain.*;
@Entity @Table(name="incident_relationship") public class IncidentLink {
    @Id public UUID id = UUID.randomUUID();
    public UUID sourceId;
    public UUID targetId;
    public String type;
    public UUID confirmedBy;
    public Instant confirmedAt;
}
