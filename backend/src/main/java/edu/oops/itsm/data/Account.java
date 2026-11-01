package edu.oops.itsm.data;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.*;
import edu.oops.itsm.domain.*;
@Entity @Table(name="app_user") public class Account {
    @Id public UUID id = UUID.randomUUID();
    public String displayName;
    @Column(unique=true, nullable=false) public String email;
    public String passwordHash;
    @Enumerated(EnumType.STRING) public Role role;
    public boolean active = true;
    public boolean available = true;
    public int capacity = 5;
    public int experienceMonths;
    @ElementCollection @CollectionTable(name="technician_skill", joinColumns=@JoinColumn(name="user_id")) @MapKeyColumn(name="skill_id") @Column(name="level") public Map<UUID,Integer> skills = new HashMap<>();
}
