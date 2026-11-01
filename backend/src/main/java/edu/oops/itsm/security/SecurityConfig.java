package edu.oops.itsm.security;
import edu.oops.itsm.data.*;
import edu.oops.itsm.api.ApiErrors;
import org.springframework.context.annotation.*;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.crypto.password.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import tools.jackson.databind.ObjectMapper;
@Configuration public class SecurityConfig {
    @Bean PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
    @Bean UserDetailsService userDetailsService(Store store) {
        return email -> {
            var rows = store.rows(Account.class,"select a from Account a where a.email=:email","email",email.trim().toLowerCase(java.util.Locale.ROOT));
            if (rows.isEmpty()) throw new UsernameNotFoundException("Invalid credentials");
            var a = rows.getFirst();
            return User.withUsername(a.email).password(a.passwordHash).roles(a.role.name()).disabled(!a.active).build();
        }
        ;
    }
    @Bean SecurityFilterChain security(HttpSecurity http, ObjectMapper json) throws Exception {
        return http.authorizeHttpRequests(a -> a .requestMatchers("/api/v1/auth/csrf","/api/v1/auth/register","/api/v1/auth/login","/error").permitAll() .anyRequest().authenticated()) .formLogin(f -> f.loginProcessingUrl("/api/v1/auth/login").usernameParameter("email") .successHandler((req,res,auth) -> {
            res.setContentType("application/json"); json.writeValue(res.getOutputStream(),java.util.Map.of("authenticated",true));
        }
        ) .failureHandler((req,res,e) -> {
            res.setStatus(401); res.setContentType("application/json"); json.writeValue(res.getOutputStream(),ApiErrors.body("INVALID_CREDENTIALS","Email or password is incorrect."));
        }
        )) .logout(l -> l.logoutUrl("/api/v1/auth/logout").logoutSuccessHandler((req,res,auth) -> res.setStatus(204))) .exceptionHandling(e -> e .authenticationEntryPoint((req,res,ex) -> {
            res.setStatus(401); res.setContentType("application/json"); json.writeValue(res.getOutputStream(),ApiErrors.body("UNAUTHENTICATED","Login required."));
        }
        ) .accessDeniedHandler((req,res,ex) -> {
            res.setStatus(403); res.setContentType("application/json"); json.writeValue(res.getOutputStream(),ApiErrors.body("FORBIDDEN","Access denied or CSRF token missing."));
        }
        )) .build();
    }
}
