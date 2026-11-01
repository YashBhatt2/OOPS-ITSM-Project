package edu.oops.itsm.data;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.*;
import edu.oops.itsm.domain.*;
@Entity @Table(name="incident_comment") public class Comment {
    @Id public UUID id = UUID.randomUUID();
    public UUID incidentId;
    public UUID authorId;
    @Column(length=10000) public String body;
    public String kind;
    public String visibility;
    public UUID replyToId;
    public Instant createdAt;
}
