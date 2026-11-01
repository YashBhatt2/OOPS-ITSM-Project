package edu.oops.itsm.domain;
import java.util.*;
public final class SkillFirstAssignment implements AssignmentStrategy {
    public String name() {
        return "SKILL_FIRST";
    }
    public List<TechnicianCandidate> rank(List<TechnicianCandidate> candidates, Map<UUID, Integer> required) {
        return candidates.stream().filter(c -> c.eligible(required)).sorted( Comparator.<TechnicianCandidate>comparingInt(c -> c.skillScore(required)).reversed() .thenComparing(Comparator.comparingInt(TechnicianCandidate::experienceMonths).reversed()) .thenComparingLong(TechnicianCandidate::workload).thenComparing(TechnicianCandidate::id)).toList();
    }
}
