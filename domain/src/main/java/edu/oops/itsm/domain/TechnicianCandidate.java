package edu.oops.itsm.domain;
import java.util.*;
public record TechnicianCandidate(UUID id, boolean active, boolean available, int capacity, long workload, int experienceMonths, Map<UUID, Integer> skills) {
    public TechnicianCandidate {
        skills = Map.copyOf(skills);
    }
    public boolean eligible(Map<UUID, Integer> required) {
        return active && available && workload < capacity && required.entrySet().stream().allMatch(e -> skills.getOrDefault(e.getKey(), 0) >= e.getValue());
    }
    public int skillScore(Map<UUID, Integer> required) {
        return required.keySet().stream().mapToInt(s -> skills.getOrDefault(s, 0)).sum();
    }
}
