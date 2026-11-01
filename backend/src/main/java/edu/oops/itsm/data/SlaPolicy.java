package edu.oops.itsm.data;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.*;
import edu.oops.itsm.domain.*;
@Entity @Table(name="sla_policy") public class SlaPolicy {
    @Id public UUID id = UUID.randomUUID();
    public UUID serviceId;
    public int revision;
    public Instant createdAt;
    @ElementCollection @CollectionTable(name="sla_target", joinColumns=@JoinColumn(name="policy_id")) @MapKeyEnumerated(EnumType.STRING) @MapKeyColumn(name="priority") public Map<Priority,SlaTarget> targets = new EnumMap<>(Priority.class);
}
