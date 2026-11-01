package edu.oops.itsm.domain;
import java.util.*;
public final class LoadFirstAssignment implements AssignmentStrategy {
    public String name() {
        return "LOAD_FIRST";
    }
    public List<TechnicianCandidate> rank(List<TechnicianCandidate> candidates, Map<UUID, Integer> required) {
        return candidates.stream().filter(c -> c.eligible(required)).sorted( Comparator.comparingLong(TechnicianCandidate::workload) .thenComparing(Comparator.<TechnicianCandidate>comparingInt(c -> c.skillScore(required)).reversed()) .thenComparing(TechnicianCandidate::id)).toList();
    }
}
