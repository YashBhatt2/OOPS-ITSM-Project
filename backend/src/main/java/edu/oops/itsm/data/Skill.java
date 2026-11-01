package edu.oops.itsm.data;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.*;
import edu.oops.itsm.domain.*;
@Entity @Table(name="skill") public class Skill {
    @Id public UUID id = UUID.randomUUID();
    public String name;
    public boolean active = true;
}
