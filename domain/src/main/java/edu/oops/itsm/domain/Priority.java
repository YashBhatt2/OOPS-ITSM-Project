package edu.oops.itsm.domain;
public enum Priority {
    P1, P2, P3, P4;
    public Priority raiseOneBand() {
        return values()[Math.max(0, ordinal() - 1)];
    }
}
