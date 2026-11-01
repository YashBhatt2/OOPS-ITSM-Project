package edu.oops.itsm.intelligence;
import edu.oops.itsm.domain.DomainException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;
import java.net.*;
import java.net.http.*;
import java.time.Duration;
import java.util.*;
@Component public class IntelligenceClient {
    public record Match(UUID incidentId,double similarityScore,String explanation) {
    }
    public record Result(String requestId,String schemaVersion,String modelVersion,List<Match> results) {
    }
    private final String url,token;
    private final ObjectMapper json;
    private final HttpClient client=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(2)).build();
    public IntelligenceClient(@Value("${itsm.intelligence.url:}") String url,@Value("${itsm.intelligence.token:}") String token,ObjectMapper json) {
        this.url=url;
        this.token=token;
        this.json=json;
    }
    public Result rank(String kind,Map<String,Object> query,List<Map<String,Object>> candidates) {
        if(url.isBlank())throw unavailable();
        String requestId=UUID.randomUUID().toString();
        if(candidates.isEmpty())return new Result(requestId,"1","no-candidates",List.of());
        try {
            var payload=Map.of("requestId",requestId,"schemaVersion","1","query",query,"candidates",candidates,"limit",5);
            var builder=HttpRequest.newBuilder(URI.create(url.replaceAll("/$","")+"/v1/"+kind+"/rank")).timeout(Duration.ofSeconds(2)).header("Content-Type","application/json").POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(payload)));
            if(!token.isBlank())builder.header("Authorization","Bearer "+token);
            var response=client.send(builder.build(),HttpResponse.BodyHandlers.ofString());
            if(response.statusCode()!=200 || response.body().length()>100000)throw unavailable();
            var result=json.readValue(response.body(),Result.class);
            if(!requestId.equals(result.requestId()) || !"1".equals(result.schemaVersion()) || result.modelVersion()==null || result.results()==null || result.results().size()>5)throw unavailable();
            var ids=new HashSet<Object>();
            candidates.forEach(c->ids.add(c.get("incidentId")));
            var seen=new HashSet<UUID>();
            for(var m:result.results())if(m==null || !ids.contains(m.incidentId()) || !seen.add(m.incidentId()) || !Double.isFinite(m.similarityScore()) || m.similarityScore()<0 || m.similarityScore()>1)throw unavailable();
            return result;
        }
        catch(InterruptedException e) {
            Thread.currentThread().interrupt();
            throw unavailable();
        }
        catch(Exception e) {
            throw unavailable();
        }
    }
    private DomainException unavailable() {
        return new DomainException("INTELLIGENCE_UNAVAILABLE","Suggestions are temporarily unavailable. You can continue without them.");
    }
}
