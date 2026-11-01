package edu.oops.itsm.domain;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.*;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
class DomainRulesTest {
    private final Instant now=Instant.parse("2026-11-01T10:00:00Z");
    @ParameterizedTest @CsvSource( {
        "1,P4","3,P4","4,P3","8,P3","9,P2","17,P2","18,P1","27,P1"
    }
    ) void priorityBoundaries(int score,Priority expected) {
        assertEquals(expected,new PriorityCalculator().fromScore(score));
    }
    @ParameterizedTest @CsvSource( {
        "1,1,1,P4","2,2,2,P3","3,2,3,P1","3,3,1,P2"
    }
    ) void priorityUsesAllInputs(int impact,int urgency,int criticality,Priority expected) {
        assertEquals(expected,new PriorityCalculator().calculate(impact,urgency,criticality));
    }
    @ParameterizedTest @ValueSource(ints= {
        -1,0,4,100
    }
    ) void invalidPriorityInputs(int value) {
        assertThrows(DomainException.class,()->new PriorityCalculator().calculate(value,1,1));
    }
    @Test void relatedReportsRaiseAtMostOneBand() {
        var c=new PriorityCalculator();
        assertEquals(Priority.P3,c.withRelatedReports(Priority.P3,2));
        assertEquals(Priority.P2,c.withRelatedReports(Priority.P3,3));
        assertEquals(Priority.P2,c.withRelatedReports(Priority.P3,1000));
        assertEquals(Priority.P1,c.withRelatedReports(Priority.P1,1000));
    }
    @ParameterizedTest @CsvSource( {
        "NEW,ASSIGN,ASSIGNED","ASSIGNED,ACKNOWLEDGE,ACKNOWLEDGED","ACKNOWLEDGED,START,IN_PROGRESS","IN_PROGRESS,RESOLVE,RESOLVED","RESOLVED,VERIFY,VERIFIED","VERIFIED,CLOSE,CLOSED","RESOLVED,REJECT,IN_PROGRESS","IN_PROGRESS,ASSIGN,ASSIGNED"
    }
    ) void legalTransitions(IncidentStatus from,Lifecycle.Action action,IncidentStatus to) {
        assertEquals(to,new Lifecycle().transition(from,action,null,now));
    }
    @ParameterizedTest @CsvSource( {
        "NEW,CLOSE","NEW,RESOLVE","ASSIGNED,RESOLVE","CLOSED,ASSIGN","VERIFIED,ACKNOWLEDGE","IN_PROGRESS,VERIFY","RESOLVED,CLOSE"
    }
    ) void illegalTransitions(IncidentStatus from,Lifecycle.Action action) {
        assertThrows(InvalidTransitionException.class,()->new Lifecycle().transition(from,action,null,now));
    }
    @Test void reopenAtSevenDays() {
        assertEquals(IncidentStatus.NEW,new Lifecycle().transition(IncidentStatus.CLOSED,Lifecycle.Action.REOPEN,now,now.plus(Duration.ofDays(7))));
    }
    @Test void reopenBeforeSevenDays() {
        assertEquals(IncidentStatus.NEW,new Lifecycle().transition(IncidentStatus.CLOSED,Lifecycle.Action.REOPEN,now,now.plusSeconds(1)));
    }
    @Test void reopenAfterWindowFails() {
        assertThrows(DomainException.class,()->new Lifecycle().transition(IncidentStatus.CLOSED,Lifecycle.Action.REOPEN,now,now.plus(Duration.ofDays(7)).plusNanos(1)));
    }
    @Test void reopeningUnclosedFails() {
        assertThrows(InvalidTransitionException.class,()->new Lifecycle().transition(IncidentStatus.RESOLVED,Lifecycle.Action.REOPEN,null,now));
    }
    @Test void responseExactlyAtDeadlineIsOnTime() {
        assertEquals(SlaRules.Assessment.MET,new SlaRules().assess(now,now.plusSeconds(300),now.plusSeconds(300),now.plusSeconds(1000)));
    }
    @Test void delayedMonitorDetectsLateCompletion() {
        assertEquals(SlaRules.Assessment.BREACHED,new SlaRules().assess(now,now.plusSeconds(300),now.plusSeconds(301),now.plusSeconds(1000)));
    }
    @Test void warningAtEightyPercent() {
        assertEquals(SlaRules.Assessment.AT_RISK,new SlaRules().assess(now,now.plusSeconds(300),null,now.plusSeconds(240)));
    }
    @Test void beforeWarningIsOnTrack() {
        assertEquals(SlaRules.Assessment.ON_TRACK,new SlaRules().assess(now,now.plusSeconds(300),null,now.plusSeconds(239)));
    }
    @Test void incompleteAtDeadlineNotYetBreached() {
        assertEquals(SlaRules.Assessment.AT_RISK,new SlaRules().assess(now,now.plusSeconds(300),null,now.plusSeconds(300)));
    }
    @Test void incompletePastDeadlineBreached() {
        assertEquals(SlaRules.Assessment.BREACHED,new SlaRules().assess(now,now.plusSeconds(300),null,now.plusSeconds(301)));
    }
    @Test void targetMustBePositive() {
        assertThrows(DomainException.class,()->new SlaRules().deadline(now,0));
    }
    private final UUID skill=UUID.fromString("00000000-0000-4000-8000-000000000001");
    private TechnicianCandidate technician(int id,int level,long load,boolean available) {
        return new TechnicianCandidate(new UUID(0,id),true,available,5,load,12,Map.of(skill,level));
    }
    @Test void skillFirstPrefersSkillOverLoad() {
        var expert=technician(1,5,4,true);
        var novice=technician(2,3,0,true);
        assertEquals(expert,new SkillFirstAssignment().rank(List.of(novice,expert),Map.of(skill,3)).getFirst());
    }
    @Test void loadFirstPrefersLowerLoadAmongEligible() {
        var expert=technician(1,5,4,true);
        var novice=technician(2,3,0,true);
        assertEquals(novice,new LoadFirstAssignment().rank(List.of(expert,novice),Map.of(skill,3)).getFirst());
    }
    @Test void unavailableAndFullAndUnskilledAreExcluded() {
        var values=List.of(technician(1,5,0,false),technician(2,5,5,true),technician(3,1,0,true));
        assertTrue(new SkillFirstAssignment().rank(values,Map.of(skill,3)).isEmpty());
        assertTrue(new LoadFirstAssignment().rank(values,Map.of(skill,3)).isEmpty());
    }
    @Test void stableTieBreak() {
        var first=technician(1,3,0,true);
        var second=technician(2,3,0,true);
        assertEquals(List.of(first,second),new SkillFirstAssignment().rank(List.of(second,first),Map.of(skill,3)));
    }
    @Test void missingSkillIsIneligible() {
        assertFalse(new TechnicianCandidate(UUID.randomUUID(),true,true,5,0,0,Map.of()).eligible(Map.of(skill,1)));
    }
    @Test void inactiveTechnicianIsIneligible() {
        assertFalse(new TechnicianCandidate(UUID.randomUUID(),false,true,5,0,0,Map.of(skill,5)).eligible(Map.of(skill,1)));
    }
    @Test void candidateSkillsAreImmutable() {
        var source=new HashMap<UUID,Integer>();
        source.put(skill,3);
        var c=new TechnicianCandidate(UUID.randomUUID(),true,true,5,0,0,source);
        source.clear();
        assertEquals(3,c.skills().get(skill));
        assertThrows(UnsupportedOperationException.class,()->c.skills().clear());
    }
    @Test void capacityOnlyIncludesActiveAssignments() {
        assertTrue(IncidentStatus.ASSIGNED.consumesCapacity());
        assertTrue(IncidentStatus.IN_PROGRESS.consumesCapacity());
        assertFalse(IncidentStatus.RESOLVED.consumesCapacity());
        assertFalse(IncidentStatus.CLOSED.consumesCapacity());
    }
}
