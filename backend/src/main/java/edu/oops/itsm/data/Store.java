package edu.oops.itsm.data;
import jakarta.persistence.*;
import org.springframework.stereotype.Repository;
import java.util.*;
import edu.oops.itsm.domain.DomainException;
@Repository public class Store {
    @PersistenceContext private EntityManager em;
    public <T> T get(Class<T> type, UUID id) {
        T value = em.find(type, id);
        if (value == null) throw new DomainException("NOT_FOUND", "Resource not found.");
        return value;
    }
    public <T> T lock(Class<T> type, UUID id) {
        T value = em.find(type, id, LockModeType.PESSIMISTIC_WRITE);
        if (value == null) throw new DomainException("NOT_FOUND", "Resource not found.");
        return value;
    }
    public <T> T add(T value) {
        em.persist(value);
        return value;
    }
    public void flush() {
        em.flush();
    }
    public <T> List<T> rows(Class<T> type, String jpql, Object... pairs) {
        return query(type, jpql, pairs).getResultList();
    }
    public <T> TypedQuery<T> query(Class<T> type, String jpql, Object... pairs) {
        var query = em.createQuery(jpql, type);
        for (int i=0;i<pairs.length;i+=2) query.setParameter((String)pairs[i], pairs[i+1]);
        return query;
    }
    public long count(String jpql, Object... pairs) {
        return query(Long.class, jpql, pairs).getSingleResult();
    }
}
