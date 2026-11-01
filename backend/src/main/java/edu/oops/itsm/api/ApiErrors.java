package edu.oops.itsm.api;
import edu.oops.itsm.domain.DomainException;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import java.util.*;
@RestControllerAdvice public class ApiErrors {
    public record Error(String code, String message, List<?> fieldErrors, String requestId) {
    }
    public static Error body(String code, String message) {
        return new Error(code,message,List.of(),UUID.randomUUID().toString());
    }
    @ExceptionHandler(DomainException.class) ResponseEntity<Error> domain(DomainException e) {
        int status = switch(e.code()) {
            case "NOT_FOUND" -> 404;
            case "FORBIDDEN" -> 403;
            case "UNAUTHENTICATED" -> 401;
            case "INVALID_INPUT" -> 400;
            case "INTELLIGENCE_UNAVAILABLE" -> 503;
            default -> 409;
        }
        ;
        return ResponseEntity.status(status).body(body(e.code(),e.getMessage()));
    }
    @ExceptionHandler(MethodArgumentNotValidException.class) ResponseEntity<Error> validation(MethodArgumentNotValidException e) {
        var fields = e.getBindingResult().getFieldErrors().stream().map(f -> Map.of("field",f.getField(),"message",Objects.requireNonNullElse(f.getDefaultMessage(),"Invalid value"))).toList();
        return ResponseEntity.badRequest().body(new Error("INVALID_INPUT","Check the submitted fields.",fields,UUID.randomUUID().toString()));
    }
    @ExceptionHandler( {
        HttpMessageNotReadableException.class,org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class,IllegalArgumentException.class
    }
    ) ResponseEntity<Error> malformed(Exception e) {
        return ResponseEntity.badRequest().body(body("INVALID_INPUT","Request contains an invalid or unsupported value."));
    }
    @ExceptionHandler( {
        DataIntegrityViolationException.class,ObjectOptimisticLockingFailureException.class
    }
    ) ResponseEntity<Error> conflict(Exception e) {
        return ResponseEntity.status(409).body(body("CONFLICT","The record conflicts with an existing record or concurrent change."));
    }
    @ExceptionHandler(org.springframework.web.servlet.resource.NoResourceFoundException.class) ResponseEntity<Error> notFound(Exception e) {
        return ResponseEntity.status(404).body(body("NOT_FOUND","Resource not found."));
    }
    @ExceptionHandler(Exception.class) ResponseEntity<Error> unexpected(Exception e) {
        var error=body("INTERNAL_ERROR","The request could not be completed.");
        org.slf4j.LoggerFactory.getLogger(getClass()).error("Request {} failed: {}",error.requestId(),e.getClass().getName());
        return ResponseEntity.status(500).body(error);
    }
}
