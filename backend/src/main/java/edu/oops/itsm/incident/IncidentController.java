package edu.oops.itsm.incident;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import java.time.Instant;
import java.util.*;
@RestController @RequestMapping("/api/v1") public class IncidentController {
    private final IncidentService service;
    private final IncidentQueries queries;
    public IncidentController(IncidentService service,IncidentQueries queries) {
        this.service=service;
        this.queries=queries;
    }
    @PostMapping("/incidents") @ResponseStatus(org.springframework.http.HttpStatus.CREATED) Object create(@Valid @RequestBody IncidentService.Create r) {
        var created=service.create(r);
        return org.springframework.http.ResponseEntity.created(java.net.URI.create("/api/v1/incidents/"+created.get("id"))).body(created);
    }
    @GetMapping("/incidents") Object list(@RequestParam Map<String,String> filters) {
        return queries.list(filters);
    }
    @GetMapping("/incidents/{id}") Object get(@PathVariable UUID id) {
        return service.get(id);
    }
    @PatchMapping("/incidents/{id}") Object edit(@PathVariable UUID id,@Valid @RequestBody IncidentService.Edit r) {
        return service.edit(id,r);
    }
    @PostMapping("/incidents/{id}/{action:acknowledge|start-investigation|resolutions|verify|reject-resolution|close|reopen}") Object action(@PathVariable UUID id,@PathVariable String action,@Valid @RequestBody IncidentService.Action r) {
        return service.action(id,action,r);
    }
    public record Recommendation(String strategy) {
    }
    @PostMapping("/incidents/{id}/assignment-recommendations") Object recommendations(@PathVariable UUID id,@RequestBody Recommendation r) {
        return service.recommendations(id,r.strategy());
    }
    @PostMapping("/incidents/{id}/assignments") Object assign(@PathVariable UUID id,@Valid @RequestBody IncidentService.Assign r) {
        return service.assign(id,r);
    }
    @PostMapping("/incidents/{id}/priority-overrides") Object override(@PathVariable UUID id,@Valid @RequestBody IncidentService.Override r) {
        return service.override(id,r);
    }
    @PostMapping("/incidents/{id}/priority-overrides/reset") Object reset(@PathVariable UUID id,@Valid @RequestBody IncidentService.Action r) {
        return service.resetPriority(id,r);
    }
    @PostMapping("/incidents/{id}/classification") Object classify(@PathVariable UUID id,@Valid @RequestBody IncidentService.Classification r) {
        return service.classify(id,r);
    }
    @PostMapping("/incidents/{id}/priority-recalculation") Object recalculate(@PathVariable UUID id,@Valid @RequestBody IncidentService.Action r) {
        return service.recalculate(id,r);
    }
    @GetMapping("/incidents/{id}/comments") Object comments(@PathVariable UUID id) {
        return service.comments(id);
    }
    @PostMapping("/incidents/{id}/comments") Object comment(@PathVariable UUID id,@Valid @RequestBody IncidentService.CommentInput r) {
        return service.comment(id,r);
    }
    @GetMapping("/incidents/{id}/history") Object history(@PathVariable UUID id) {
        return service.history(id);
    }
    @PostMapping("/incidents/{id}/feedback") Object feedback(@PathVariable UUID id,@Valid @RequestBody IncidentService.FeedbackInput r) {
        return service.feedback(id,r);
    }
    @PostMapping("/incidents/{id}/relationships") Object link(@PathVariable UUID id,@Valid @RequestBody IncidentService.LinkInput r) {
        return service.link(id,r);
    }
    @GetMapping("/dashboards/me") Object dashboard() {
        return queries.dashboard();
    }
    @GetMapping("/reports/{kind:overview|services|technician-workload}") Object report(@PathVariable String kind,@RequestParam(required=false) Instant createdFrom,@RequestParam(required=false) Instant createdTo) {
        return queries.report(kind,createdFrom,createdTo);
    }
}
