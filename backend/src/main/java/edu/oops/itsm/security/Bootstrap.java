package edu.oops.itsm.security;
import edu.oops.itsm.catalog.CatalogService;
import edu.oops.itsm.data.*;
import edu.oops.itsm.domain.Role;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.ApplicationArguments;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
@Component public class Bootstrap implements ApplicationRunner {
    private final Store db;
    private final CatalogService accounts;
    private final String email,password;
    public Bootstrap(Store db,CatalogService accounts,@Value("${itsm.bootstrap.email}") String email,@Value("${itsm.bootstrap.password}") String password) {
        this.db=db;
        this.accounts=accounts;
        this.email=email;
        this.password=password;
    }
    @Override @Transactional public void run(ApplicationArguments args) {
        if(db.count("select count(a) from Account a where a.role=:role","role",Role.ADMIN)>0 || email.isBlank()) return;
        if(password.length()<12 || password.getBytes(java.nio.charset.StandardCharsets.UTF_8).length>72) throw new IllegalStateException("Bootstrap administrator password must be 12 characters or more and at most 72 UTF-8 bytes.");
        accounts.create("Administrator",email,password,Role.ADMIN);
    }
}
