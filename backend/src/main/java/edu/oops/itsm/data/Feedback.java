package edu.oops.itsm.data;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.*;
import edu.oops.itsm.domain.*;
@Entity @Table(name="feedback") public class Feedback {
    @Id public UUID id = UUID.randomUUID();
    public UUID cycleId;
    public UUID reporterId;
    public int rating;
    public String text;
    public Instant createdAt;
}
