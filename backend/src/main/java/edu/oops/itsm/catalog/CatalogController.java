package edu.oops.itsm.catalog;
import edu.oops.itsm.security.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.web.csrf.CsrfToken;
import java.util.*;
@RestController @RequestMapping("/api/v1") public class CatalogController {
    private final CatalogService service;
    private final CurrentUser user;
    public CatalogController(CatalogService service,CurrentUser user) {
        this.service=service;
        this.user=user;
    }
    @GetMapping("/auth/csrf") Object csrf(CsrfToken token) {
        return Map.of("token",token.getToken(),"headerName",token.getHeaderName());
    }
    @PostMapping("/auth/register") @ResponseStatus(org.springframework.http.HttpStatus.CREATED) Object register(@Valid @RequestBody CatalogService.Registration r) {
        return service.register(r);
    }
    @GetMapping("/auth/me") Object me() {
        return service.view(user.get());
    }
    @GetMapping( {
        "/services","/categories","/skills"
    }
    ) Object catalog(jakarta.servlet.http.HttpServletRequest r) {
        return service.catalog(r.getRequestURI().substring(r.getRequestURI().lastIndexOf('/')+1),false);
    }
    @GetMapping( {
        "/admin/services","/admin/categories","/admin/skills"
    }
    ) Object adminCatalog(jakarta.servlet.http.HttpServletRequest r) {
        return service.catalog(r.getRequestURI().substring(r.getRequestURI().lastIndexOf('/')+1),true);
    }
    @PostMapping("/admin/services") Object service(@Valid @RequestBody CatalogService.ServiceInput r) {
        return Map.of("id",service.saveService(null,r));
    }
    @PatchMapping("/admin/services/{id}") Object service(@PathVariable UUID id,@Valid @RequestBody CatalogService.ServiceInput r) {
        return Map.of("id",service.saveService(id,r));
    }
    @PostMapping("/admin/categories") Object category(@Valid @RequestBody CatalogService.CategoryInput r) {
        return Map.of("id",service.saveCategory(null,r));
    }
    @PatchMapping("/admin/categories/{id}") Object category(@PathVariable UUID id,@Valid @RequestBody CatalogService.CategoryInput r) {
        return Map.of("id",service.saveCategory(id,r));
    }
    @PostMapping("/admin/skills") Object skill(@Valid @RequestBody CatalogService.NamedInput r) {
        return Map.of("id",service.saveSkill(null,r));
    }
    @PatchMapping("/admin/skills/{id}") Object skill(@PathVariable UUID id,@Valid @RequestBody CatalogService.NamedInput r) {
        return Map.of("id",service.saveSkill(id,r));
    }
    @GetMapping("/admin/users") Object users() {
        return service.users();
    }
    @PostMapping("/admin/users") Object provision(@Valid @RequestBody CatalogService.UserInput r) {
        return service.provision(r);
    }
    @PatchMapping("/admin/users/{id}") Object updateUser(@PathVariable UUID id,@Valid @RequestBody CatalogService.UserUpdate r) {
        return service.updateUser(id,r);
    }
    @GetMapping("/admin/technicians") Object technicians() {
        return service.technicians();
    }
    @PatchMapping("/admin/technicians/{id}") Object technician(@PathVariable UUID id,@Valid @RequestBody CatalogService.TechnicianInput r) {
        return service.technician(id,r);
    }
    @GetMapping("/admin/services/{id}/sla-policies") Object policies(@PathVariable UUID id) {
        return service.policies(id);
    }
    @PostMapping("/admin/services/{id}/sla-policies") Object policy(@PathVariable UUID id,@Valid @RequestBody CatalogService.PolicyInput r) {
        return service.publish(id,r);
    }
    public record StrategyInput(String strategy) {
    }
    @GetMapping("/admin/assignment-settings") Object strategy() {
        user.require(edu.oops.itsm.domain.Role.ADMIN);
        return Map.of("strategy",service.strategy());
    }
    @PatchMapping("/admin/assignment-settings") Object strategy(@RequestBody StrategyInput r) {
        return Map.of("strategy",service.strategy(r.strategy()));
    }
}
