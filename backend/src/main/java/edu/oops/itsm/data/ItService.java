package edu.oops.itsm.data;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.*;
import edu.oops.itsm.domain.*;
@Entity @Table(name="it_service") public class ItService {
    @Id public UUID id = UUID.randomUUID();
    public String name;
    @Column(length=10000) public String description;
    public int criticality;
    public boolean active = true;
}
