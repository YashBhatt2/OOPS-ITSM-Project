package edu.oops.itsm.notification;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;
@RestController @RequestMapping("/api/v1/notifications") public class NotificationController {
    private final NotificationService service;
    public NotificationController(NotificationService service) {
        this.service=service;
    }
    @GetMapping Object list(@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size) {
        return service.list(page,size);
    }
    @PostMapping("/{id}/read") @ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT) void read(@PathVariable UUID id) {
        service.read(id);
    }
}
