package edu.oops.itsm.domain;
public enum IncidentStatus {
    NEW, ASSIGNED, ACKNOWLEDGED, IN_PROGRESS, RESOLVED, VERIFIED, CLOSED;
    public boolean consumesCapacity() {
        return this == ASSIGNED || this == ACKNOWLEDGED || this == IN_PROGRESS;
    }
    public boolean active() {
        return this == NEW || consumesCapacity();
    }
}
