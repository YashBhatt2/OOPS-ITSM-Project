package edu.oops.itsm.catalog;
import edu.oops.itsm.data.*;
import edu.oops.itsm.domain.*;
import edu.oops.itsm.security.CurrentUser;
import jakarta.validation.constraints.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.time.Clock;
import java.util.*;
@Service @Transactional public class CatalogService {
    private final Store db;
    private final CurrentUser user;
    private final PasswordEncoder passwords;
    private final Clock clock;
    public CatalogService(Store db, CurrentUser user, PasswordEncoder passwords, Clock clock) {
        this.db=db;
        this.user=user;
        this.passwords=passwords;
        this.clock=clock;
    }
    public record Registration(@NotBlank @Size(max=100) String displayName,@NotBlank @Email @Size(max=254) String email,@NotBlank @Size(min=12,max=72) String password) {
    }
    public record UserInput(@NotBlank @Size(max=100) String displayName,@NotBlank @Email @Size(max=254) String email,@NotBlank @Size(min=12,max=72) String password,@NotNull Role role) {
    }
    public record UserUpdate(@NotNull Boolean active) {
    }
    public record TechnicianInput(boolean available,@Min(1) int capacity,@Min(0) int experienceMonths,@NotNull Map<UUID,Integer> skills) {
    }
    public record NamedInput(@NotBlank @Size(max=100) String name,boolean active) {
    }
    public record CategoryInput(@NotBlank @Size(max=100) String name,boolean active,@NotNull Map<UUID,Integer> requirements) {
    }
    public record ServiceInput(@NotBlank @Size(max=100) String name,@Size(max=10000) String description,@Min(1) @Max(3) int criticality,boolean active) {
    }
    public record TargetInput(@Min(1) long responseSeconds,@Min(1) long resolutionSeconds) {
    }
    public record PolicyInput(@NotNull Map<Priority,TargetInput> targets) {
    }
    public record AccountView(UUID id,String displayName,String email,Role role,boolean active) {
    }
    public AccountView view(Account a) {
        return new AccountView(a.id,a.displayName,a.email,a.role,a.active);
    }
    public AccountView register(Registration r) {
        return view(create(r.displayName(),r.email(),r.password(),Role.EMPLOYEE));
    }
    public Account create(String name,String email,String password,Role role) {
        if(password.getBytes(java.nio.charset.StandardCharsets.UTF_8).length>72) throw new DomainException("INVALID_INPUT","Password exceeds 72 UTF-8 bytes.");
        Account a=new Account();
        a.displayName=name;
        a.email=email.trim().toLowerCase(Locale.ROOT);
        a.passwordHash=passwords.encode(password);
        a.role=role;
        db.add(a);
        db.flush();
        return a;
    }
    public AccountView provision(UserInput r) {
        user.require(Role.ADMIN);
        return view(create(r.displayName(),r.email(),r.password(),r.role()));
    }
    public List<AccountView> users() {
        user.require(Role.ADMIN);
        return db.rows(Account.class,"select a from Account a order by a.email").stream().map(this::view).toList();
    }
    public AccountView updateUser(UUID id,UserUpdate r) {
        var actor=user.require(Role.ADMIN);
        var a=db.lock(Account.class,id);
        if (a.id.equals(actor.id) && !r.active()) throw new DomainException("CONFLICT","You cannot deactivate your own administrator account.");
        if(!r.active() && db.count("select count(i) from Incident i where i.assigneeId=:id and i.status in :statuses","id",id,"statuses",List.of(IncidentStatus.ASSIGNED,IncidentStatus.ACKNOWLEDGED,IncidentStatus.IN_PROGRESS))>0) throw new DomainException("CONFLICT","Reassign active incidents first.");
        a.active=r.active();
        return view(a);
    }
    private void skills(Map<UUID,Integer> values) {
        for(var e:values.entrySet()) if(e.getKey()==null || e.getValue()==null || e.getValue()<1 || e.getValue()>5 || !db.get(Skill.class,e.getKey()).active) throw new DomainException("INVALID_INPUT","Skills must be active and levels between 1 and 5.");
    }
    public Map<String,Object> technician(UUID id,TechnicianInput r) {
        user.require(Role.ADMIN);
        var a=db.lock(Account.class,id);
        if(a.role!=Role.TECHNICIAN) throw new DomainException("INVALID_INPUT","Account is not a technician.");
        skills(r.skills());
        a.available=r.available();
        a.capacity=r.capacity();
        a.experienceMonths=r.experienceMonths();
        a.skills.clear();
        a.skills.putAll(r.skills());
        return technicianView(a);
    }
    private Map<String,Object> technicianView(Account a) {
        return Map.of("id",a.id,"displayName",a.displayName,"active",a.active,"available",a.available,"capacity",a.capacity,"experienceMonths",a.experienceMonths,"skills",Map.copyOf(a.skills));
    }
    public List<Map<String,Object>> technicians() {
        user.require(Role.ADMIN);
        return db.rows(Account.class,"select a from Account a where a.role=:role order by a.displayName","role",Role.TECHNICIAN).stream().map(this::technicianView).toList();
    }
    public List<Map<String,Object>> catalog(String kind, boolean admin) {
        if(admin) user.require(Role.ADMIN);
        else user.get();
        String where=admin?"":" where e.active=true";
        return switch(kind) {
            case "services" -> db.rows(ItService.class,"select e from ItService e"+where+" order by e.name").stream().map(e -> Map.<String,Object>of("id",e.id,"name",e.name,"description",Objects.requireNonNullElse(e.description,""),"criticality",e.criticality,"active",e.active)).toList();
            case "categories" -> db.rows(Category.class,"select e from Category e"+where+" order by e.name").stream().map(e -> Map.<String,Object>of("id",e.id,"name",e.name,"active",e.active,"requirements",Map.copyOf(e.requirements))).toList();
            case "skills" -> db.rows(Skill.class,"select e from Skill e"+where+" order by e.name").stream().map(e -> Map.<String,Object>of("id",e.id,"name",e.name,"active",e.active)).toList();
            default -> throw new DomainException("NOT_FOUND","Catalog not found.");
        }
        ;
    }
    public UUID saveService(UUID id,ServiceInput r) {
        user.require(Role.ADMIN);
        var e=id==null?db.add(new ItService()):db.lock(ItService.class,id);
        e.name=r.name();
        e.description=r.description();
        e.criticality=r.criticality();
        e.active=r.active();
        return e.id;
    }
    public UUID saveSkill(UUID id,NamedInput r) {
        user.require(Role.ADMIN);
        var e=id==null?db.add(new Skill()):db.lock(Skill.class,id);
        e.name=r.name();
        e.active=r.active();
        return e.id;
    }
    public UUID saveCategory(UUID id,CategoryInput r) {
        user.require(Role.ADMIN);
        skills(r.requirements());
        var e=id==null?db.add(new Category()):db.lock(Category.class,id);
        e.name=r.name();
        e.active=r.active();
        e.requirements.clear();
        e.requirements.putAll(r.requirements());
        return e.id;
    }
    public Map<String,Object> publish(UUID serviceId,PolicyInput r) {
        user.require(Role.ADMIN);
        db.lock(ItService.class,serviceId);
        if(r.targets().size()!=4 || !r.targets().keySet().containsAll(List.of(Priority.values()))) throw new DomainException("INVALID_INPUT","Provide targets for all four priorities.");
        var p=new SlaPolicy();
        p.serviceId=serviceId;
        p.revision=(int)db.count("select count(p) from SlaPolicy p where p.serviceId=:id","id",serviceId)+1;
        p.createdAt=clock.instant();
        r.targets().forEach((priority,t) -> {
            if(t==null || t.responseSeconds()<1 || t.resolutionSeconds()<t.responseSeconds()) throw new DomainException("INVALID_INPUT","Resolution target must be at least the positive response target.");p.targets.put(priority,new SlaTarget(t.responseSeconds(),t.resolutionSeconds()));
        }
        );
        db.add(p);
        return policyView(p);
    }
    public List<Map<String,Object>> policies(UUID serviceId) {
        user.require(Role.ADMIN);
        return db.rows(SlaPolicy.class,"select p from SlaPolicy p where p.serviceId=:id order by p.revision desc","id",serviceId).stream().map(this::policyView).toList();
    }
    private Map<String,Object> policyView(SlaPolicy p) {
        var targets=new LinkedHashMap<String,Object>();
        p.targets.forEach((k,v)->targets.put(k.name(),Map.of("responseSeconds",v.responseSeconds,"resolutionSeconds",v.resolutionSeconds)));
        return Map.of("id",p.id,"revision",p.revision,"targets",targets,"createdAt",p.createdAt);
    }
    public String strategy() {
        return db.rows(Setting.class,"select s from Setting s where s.name='assignment_strategy'").getFirst().value;
    }
    public String strategy(String value) {
        user.require(Role.ADMIN);
        if(!List.of("SKILL_FIRST","LOAD_FIRST").contains(value)) throw new DomainException("INVALID_INPUT","Unknown assignment strategy.");
        var s=db.rows(Setting.class,"select s from Setting s where s.name='assignment_strategy'").getFirst();
        s.value=value;
        return value;
    }
}
