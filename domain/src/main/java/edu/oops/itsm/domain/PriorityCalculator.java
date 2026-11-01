package edu.oops.itsm.domain;
public final class PriorityCalculator {
    public Priority calculate(int impact, int urgency, int criticality) {
        for (int value : new int[] {
            impact, urgency, criticality
        }
        ) if (value < 1 || value > 3) throw new DomainException("INVALID_INPUT", "Priority inputs must be between 1 and 3.");
        return fromScore(impact * urgency * criticality);
    }
    public Priority fromScore(int score) {
        if (score < 1 || score > 27) throw new DomainException("INVALID_INPUT", "Score must be between 1 and 27.");
        return score >= 18 ? Priority.P1 : score >= 9 ? Priority.P2 : score >= 4 ? Priority.P3 : Priority.P4;
    }
    public Priority withRelatedReports(Priority base, long distinctReporters) {
        return distinctReporters >= 3 ? base.raiseOneBand() : base;
    }
}
