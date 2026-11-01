package edu.oops.itsm.domain;
import java.time.*;
public final class Lifecycle {
    public enum Action {
        ASSIGN, ACKNOWLEDGE, START, RESOLVE, VERIFY, REJECT, CLOSE, REOPEN
    }
    public IncidentStatus transition(IncidentStatus current, Action action, Instant closedAt, Instant now) {
        return switch (action) {
            case ASSIGN -> require(current, IncidentStatus.ASSIGNED, IncidentStatus.NEW, IncidentStatus.ASSIGNED, IncidentStatus.ACKNOWLEDGED, IncidentStatus.IN_PROGRESS);
            case ACKNOWLEDGE -> require(current, IncidentStatus.ACKNOWLEDGED, IncidentStatus.ASSIGNED);
            case START -> require(current, IncidentStatus.IN_PROGRESS, IncidentStatus.ACKNOWLEDGED);
            case RESOLVE -> require(current, IncidentStatus.RESOLVED, IncidentStatus.IN_PROGRESS);
            case VERIFY -> require(current, IncidentStatus.VERIFIED, IncidentStatus.RESOLVED);
            case REJECT -> require(current, IncidentStatus.IN_PROGRESS, IncidentStatus.RESOLVED);
            case CLOSE -> require(current, IncidentStatus.CLOSED, IncidentStatus.VERIFIED);
            case REOPEN -> {
                require(current, IncidentStatus.NEW, IncidentStatus.CLOSED);
                if (closedAt == null || now.isBefore(closedAt) || now.isAfter(closedAt.plus(Duration.ofDays(7)))) throw new DomainException("REOPEN_WINDOW_EXPIRED", "Reopening is allowed within seven days of closure.");
                yield IncidentStatus.NEW;
            }
        }
        ;
    }
    private IncidentStatus require(IncidentStatus current, IncidentStatus next, IncidentStatus... allowed) {
        for (var candidate : allowed) if (current == candidate) return next;
        throw new InvalidTransitionException("Cannot move from " + current + " to " + next + ".");
    }
}
