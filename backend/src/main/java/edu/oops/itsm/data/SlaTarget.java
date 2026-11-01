package edu.oops.itsm.data;
import jakarta.persistence.*;
@Embeddable public class SlaTarget {
    public long responseSeconds;
    public long resolutionSeconds;
    public SlaTarget() {
    }
    public SlaTarget(long responseSeconds, long resolutionSeconds) {
        this.responseSeconds = responseSeconds;
        this.resolutionSeconds = resolutionSeconds;
    }
}
