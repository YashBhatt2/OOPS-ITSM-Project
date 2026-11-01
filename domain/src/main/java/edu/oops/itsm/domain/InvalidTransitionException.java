package edu.oops.itsm.domain;
public final class InvalidTransitionException extends DomainException {
    public InvalidTransitionException(String message) {
        super("INVALID_TRANSITION", message);
    }
}
