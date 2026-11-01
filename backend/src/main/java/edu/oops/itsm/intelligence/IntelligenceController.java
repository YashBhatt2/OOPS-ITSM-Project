package edu.oops.itsm.intelligence;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;
@RestController @RequestMapping("/api/v1") public class IntelligenceController {
    private final IntelligenceService service;
    public IntelligenceController(IntelligenceService service) {
        this.service=service;
    }
    @PostMapping("/incident-suggestions/duplicates") Object duplicates(@Valid @RequestBody IntelligenceService.Draft r) {
        return service.duplicates(r);
    }
    @GetMapping("/incidents/{id}/resolution-suggestions") Object resolutions(@PathVariable UUID id) {
        return service.resolutions(id);
    }
}
