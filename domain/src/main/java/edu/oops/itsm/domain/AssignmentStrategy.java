package edu.oops.itsm.domain;
import java.util.*;
public interface AssignmentStrategy {
    String name();
    List<TechnicianCandidate> rank(List<TechnicianCandidate> candidates, Map<UUID, Integer> requirements);
}
