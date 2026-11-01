package edu.oops.itsm.domain;
import java.time.*;
public final class SlaRules {
    public enum Assessment {
        ON_TRACK, AT_RISK, BREACHED, MET
    }
    public Instant deadline(Instant openedAt, long seconds) {
        if (seconds <= 0) throw new DomainException("INVALID_INPUT", "SLA duration must be positive.");
        return openedAt.plusSeconds(seconds);
    }
    public Assessment assess(Instant openedAt, Instant deadline, Instant completedAt, Instant now) {
        if (completedAt != null) return completedAt.isAfter(deadline) ? Assessment.BREACHED : Assessment.MET;
        if (now.isAfter(deadline)) return Assessment.BREACHED;
        var warningAt = openedAt.plusMillis(Duration.between(openedAt, deadline).toMillis() * 4 / 5);
        return !now.isBefore(warningAt) ? Assessment.AT_RISK : Assessment.ON_TRACK;
    }
}
