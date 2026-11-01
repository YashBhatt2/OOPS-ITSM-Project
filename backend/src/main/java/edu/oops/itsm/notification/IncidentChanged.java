package edu.oops.itsm.notification;
import java.util.UUID;
public record IncidentChanged(UUID incidentId,String action) {
}
