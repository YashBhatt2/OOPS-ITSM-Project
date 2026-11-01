package edu.oops.itsm;
import edu.oops.itsm.data.*;
import edu.oops.itsm.domain.*;
import edu.oops.itsm.incident.*;
import edu.oops.itsm.sla.SlaService;
import edu.oops.itsm.catalog.CatalogService;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
@SpringBootTest(properties= {
    "spring.datasource.url=${TEST_DB_URL:jdbc:postgresql://localhost:5433/itsm_test}","spring.datasource.username=${TEST_DB_USER:itsm_test}","spring.datasource.password=${TEST_DB_PASSWORD}","itsm.bootstrap.email=","itsm.scheduling.enabled=false","itsm.intelligence.url="
}
) @AutoConfigureMockMvc @Transactional class BackendIT {
    @Autowired Store db;
    @Autowired IncidentService incidents;
    @Autowired IncidentQueries queries;
    @Autowired SlaService sla;
    @Autowired CatalogService catalog;
    @Autowired MockMvc mvc;
    Account employee,technician,admin;
    ItService service;
    Category category;
    @BeforeEach void setup() {
        employee=account("employee",Role.EMPLOYEE);
        technician=account("technician",Role.TECHNICIAN);
        admin=account("admin",Role.ADMIN);
        service=new ItService();
        service.name="Payment "+UUID.randomUUID();
        service.criticality=3;
        db.add(service);
        category=new Category();
        category.name="Application "+UUID.randomUUID();
        db.add(category);
        var policy=new SlaPolicy();
        policy.serviceId=service.id;
        policy.revision=1;
        policy.createdAt=Instant.now();
        for(var p:Priority.values())policy.targets.put(p,new SlaTarget(300,1800));
        db.add(policy);
        db.flush();
        as(employee);
    }
    @AfterEach void clear() {
        SecurityContextHolder.clearContext();
    }
    private Account account(String prefix,Role role) {
        var a=new Account();
        a.displayName=prefix;
        a.email=prefix+UUID.randomUUID()+"@example.test";
        a.passwordHash="not-used-for-mocked-authentication";
        a.role=role;
        return db.add(a);
    }
    private void as(Account a) {
        SecurityContextHolder.getContext().setAuthentication(UsernamePasswordAuthenticationToken.authenticated(a.email,"",List.of()));
    }
    private Incident create() {
        as(employee);
        var result=incidents.create(new IncidentService.Create("Payment failure","Checkout unavailable",service.id,category.id,3,3,40));
        return db.get(Incident.class,(UUID)result.get("id"));
    }
    private void assign(Incident i) {
        as(admin);
        incidents.assign(i.id,new IncidentService.Assign(i.version,technician.id,"SKILL_FIRST","Best skill match"));
    }
    private void act(Incident i,String action) {
        incidents.action(i.id,action,new IncidentService.Action(i.version,"Verified by support","Issue persists","Restored service"));
    }
    private void resolve(Incident i) {
        assign(i);
        as(technician);
        act(i,"acknowledge");
        act(i,"start-investigation");
        act(i,"resolutions");
    }
    private void close(Incident i) {
        resolve(i);
        as(admin);
        act(i,"verify");
        act(i,"close");
    }
    @Test void reportPersistsPriorityCycleAndHistory() {
        var i=create();
        assertEquals(Priority.P1,i.effectivePriority);
        assertEquals(1,i.cycleNumber);
        assertEquals(1,incidents.history(i.id).size());
        assertEquals(i.createdAt.plusSeconds(300),incidents.cycle(i).responseDueAt);
    }
    @Test void otherEmployeeCannotRead() {
        var i=create();
        as(account("other",Role.EMPLOYEE));
        assertEquals("NOT_FOUND",assertThrows(DomainException.class,()->incidents.get(i.id)).code());
    }
    @Test void employeeCannotAssign() {
        var i=create();
        assertThrows(DomainException.class,()->incidents.assign(i.id,new IncidentService.Assign(i.version,technician.id,"MANUAL","Please")));
    }
    @Test void newCannotClose() {
        var i=create();
        as(admin);
        assertThrows(DomainException.class,()->act(i,"close"));
        assertEquals(IncidentStatus.NEW,i.status);
    }
    @Test void fullWorkflowRetainsClosedIncident() {
        var i=create();
        close(i);
        assertEquals(IncidentStatus.CLOSED,db.get(Incident.class,i.id).status);
        assertNotNull(incidents.cycle(i).closedAt);
        assertTrue(incidents.history(i.id).size()>=7);
    }
    @Test void reopenPreservesPreviousCycle() {
        var i=create();
        close(i);
        var old=incidents.cycle(i);
        as(employee);
        act(i,"reopen");
        assertEquals(2,i.cycleNumber);
        assertEquals(IncidentStatus.NEW,i.status);
        assertNull(i.assigneeId);
        assertNotNull(db.get(ServiceCycle.class,old.id).closedAt);
        assertNotEquals(old.id,incidents.cycle(i).id);
    }
    @Test void expiredReopenRejected() {
        var i=create();
        close(i);
        incidents.cycle(i).closedAt=Instant.now().minus(Duration.ofDays(8));
        as(employee);
        assertThrows(DomainException.class,()->act(i,"reopen"));
    }
    @Test void rejectionRetainsResolutionAttempt() {
        var i=create();
        resolve(i);
        as(admin);
        act(i,"reject-resolution");
        assertEquals(IncidentStatus.IN_PROGRESS,i.status);
        assertNull(incidents.cycle(i).resolvedAt);
        assertEquals("REJECTED",db.rows(Resolution.class,"select r from Resolution r where r.cycleId=:id","id",incidents.cycle(i).id).getFirst().outcome);
    }
    @Test void staleVersionCannotOverwrite() {
        var i=create();
        as(admin);
        assertEquals("STALE_VERSION",assertThrows(DomainException.class,()->incidents.assign(i.id,new IncidentService.Assign(999,technician.id,"MANUAL","Reason"))).code());
    }
    @Test void unavailableTechnicianRejected() {
        var i=create();
        technician.available=false;
        as(admin);
        assertThrows(DomainException.class,()->assign(i));
        assertEquals(IncidentStatus.NEW,i.status);
    }
    @Test void capacityPreventsExtraAssignment() {
        technician.capacity=1;
        var first=create();
        assign(first);
        var second=create();
        as(admin);
        assertThrows(DomainException.class,()->assign(second));
    }
    @Test void overrideSurvivesRecalculation() {
        var i=create();
        as(admin);
        incidents.override(i.id,new IncidentService.Override(i.version,Priority.P4,"Confirmed low impact"));
        incidents.recalculate(i.id,new IncidentService.Action(i.version,null,"Re-evaluate",null));
        assertEquals(Priority.P4,i.effectivePriority);
        assertEquals(Priority.P1,i.calculatedPriority);
    }
    @Test void internalNoteHiddenFromEmployee() {
        var i=create();
        assign(i);
        as(technician);
        incidents.comment(i.id,new IncidentService.CommentInput("Private diagnostic detail","NOTE","INTERNAL",null));
        as(employee);
        assertTrue(incidents.comments(i.id).isEmpty());
        assertTrue(incidents.history(i.id).stream().noneMatch(e->e.get("action").equals("COMMENT_ADDED")));
    }
    @Test void slaMonitorIsIdempotent() {
        var i=create();
        var c=incidents.cycle(i);
        c.openedAt=Instant.now().minusSeconds(4000);
        c.responseDueAt=c.openedAt.plusSeconds(300);
        c.resolutionDueAt=c.openedAt.plusSeconds(1800);
        sla.check(c.id);
        sla.check(c.id);
        assertEquals(4,db.count("select count(e) from SlaEvent e where e.cycleId=:id","id",c.id));
    }
    @Test void lateCompletionStillBreaches() {
        var i=create();
        var c=incidents.cycle(i);
        c.responseDueAt=Instant.now().minusSeconds(10);
        c.acknowledgedAt=Instant.now().minusSeconds(5);
        sla.check(c.id);
        assertEquals(1,db.count("select count(e) from SlaEvent e where e.cycleId=:id and e.target='RESPONSE' and e.eventType='VIOLATION'","id",c.id));
    }
    @Test void combinedFiltersRespectOwnership() {
        create();
        var result=queries.list(Map.of("status","NEW","priority","P1","categoryId",category.id.toString(),"serviceId",service.id.toString(),"createdFrom","2020-01-01T00:00:00Z"));
        assertEquals(1L,result.get("totalElements"));
    }
    @Test void dashboardCountsCurrentWorkload() {
        var i=create();
        assign(i);
        as(technician);
        assertEquals(1L,queries.dashboard().get("activeWorkload"));
    }
    @Test void mutationRequiresCsrf() throws Exception {
        mvc.perform(post("/api/v1/incidents").with(user(employee.email)).contentType("application/json").content("{}" )).andExpect(status().isForbidden());
    }
    @Test void invalidReportReturns400() throws Exception {
        mvc.perform(post("/api/v1/incidents").with(user(employee.email)).with(csrf()).contentType("application/json").content("{}" )).andExpect(status().isBadRequest());
    }
    @Test void publicRegistrationRejectsRoleInjection() throws Exception {
        mvc.perform(post("/api/v1/auth/register").with(csrf()).contentType("application/json").content("{\"displayName\":\"Test\",\"email\":\"test@example.test\",\"password\":\"long-password-test\",\"role\":\"ADMIN\"}")).andExpect(status().isBadRequest());
    }
    @Test void missingModelDoesNotBlockIncidentCreation() {
        var i=create();
        assertNotNull(i.id);
    }
    @Test void loginAcceptsValidPasswordAndRejectsInvalidPassword() throws Exception {
        String email="login"+UUID.randomUUID()+"@example.test";
        catalog.register(new CatalogService.Registration("Login test",email,"valid-test-password"));
        SecurityContextHolder.clearContext();
        mvc.perform(post("/api/v1/auth/login").with(csrf()).param("email",email).param("password","incorrect-password")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/auth/login").with(csrf()).param("email",email).param("password","valid-test-password")).andExpect(status().isOk());
        var saved=db.rows(Account.class,"select a from Account a where a.email=:email","email",email).getFirst();
        assertNotEquals("valid-test-password",saved.passwordHash);
        assertEquals(Role.EMPLOYEE,saved.role);
    }
    @Test void missingIntelligenceReturns503WithoutBlockingReporting() throws Exception {
        var i=create();
        String draft="{\"title\":\"Payment unavailable\",\"description\":\"Checkout fails\",\"serviceId\":\""+service.id+"\",\"categoryId\":\""+category.id+"\"}";
        mvc.perform(post("/api/v1/incident-suggestions/duplicates").with(user(employee.email)).with(csrf()).contentType("application/json").content(draft)).andExpect(status().isServiceUnavailable());
        assertNotNull(db.get(Incident.class,i.id));
    }
}
