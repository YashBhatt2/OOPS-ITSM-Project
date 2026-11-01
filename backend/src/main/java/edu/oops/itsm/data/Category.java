package edu.oops.itsm.data;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.*;
import edu.oops.itsm.domain.*;
@Entity @Table(name="category") public class Category {
    @Id public UUID id = UUID.randomUUID();
    public String name;
    public boolean active = true;
    @ElementCollection @CollectionTable(name="category_skill", joinColumns=@JoinColumn(name="category_id")) @MapKeyColumn(name="skill_id") @Column(name="minimum_level") public Map<UUID,Integer> requirements = new HashMap<>();
}
