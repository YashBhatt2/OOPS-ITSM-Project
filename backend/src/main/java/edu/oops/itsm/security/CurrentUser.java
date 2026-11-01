package edu.oops.itsm.security;
import edu.oops.itsm.data.*;
import edu.oops.itsm.domain.*;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
@Component public class CurrentUser {
    private final Store store;
    public CurrentUser(Store store) {
        this.store = store;
    }
    public Account get() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) throw new DomainException("UNAUTHENTICATED","Login required.");
        var users = store.rows(Account.class,"select a from Account a where a.email=:email and a.active=true","email",auth.getName());
        if (users.isEmpty()) throw new DomainException("UNAUTHENTICATED","Account is unavailable.");
        return users.getFirst();
    }
    public Account require(Role role) {
        var account = get();
        if (account.role != role) throw new DomainException("FORBIDDEN","This action is not permitted for your role.");
        return account;
    }
}
