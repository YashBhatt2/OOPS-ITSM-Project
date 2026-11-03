# Intelligence team integration proposal

Status: requires agreement with the Python team. HTTP JSON is proposed; no Python framework, model, port, or hosting arrangement is mandated. Spring Boot uses an adapter so transport can change without changing incident rules.

## Responsibilities and data flow

1. React requests suggestions through Spring Boot, never directly from a public model endpoint.
2. Spring Boot authenticates the requester and selects a bounded candidate set.
3. Spring Boot sends minimal incident text and candidate metadata to the internal Python service.
4. Python returns ranked candidate IDs/scores.
5. Spring Boot validates IDs, score ranges, and permissions before returning an appropriate projection.

Python does not write the application database. No credentials, reporter contact details, internal notes, or unrestricted audit logs are sent. Cross-employee candidate matching for operational duplicate detection is permitted only through this backend-managed internal flow; raw results are not exposed to employees. Production data/training export is a separate decision, not implicitly authorized by this design.

## Proposed duplicate contract

`POST /v1/duplicates/rank`

```json
{
  "requestId":"suggestion-123",
  "schemaVersion":"1",
  "query":{"title":"Payment unavailable","description":"Checkout fails","serviceId":"service-1","categoryId":"category-1"},
  "candidates":[{"incidentId":"incident-2","title":"Checkout error","description":"Payment request fails","serviceId":"service-1","categoryId":"category-1"}],
  "limit":5
}
```

```json
{
  "requestId":"suggestion-123",
  "schemaVersion":"1",
  "modelVersion":"baseline-1",
  "results":[{"incidentId":"incident-2","similarityScore":0.84,"explanation":"Similar payment failure description"}]
}
```

Fixture IDs above are deliberately readable placeholders; real integration uses UUIDs. Proposed similarityScore range is 0–1, higher means more similar, not a calibrated probability. The team must define normalization, minimum useful threshold, and model/version behavior. Return only IDs from supplied candidates. Empty results mean successful evaluation with no match.

Proposed candidate selection: at most 100 most recent open incidents for the same service within seven days. This bounds initial cost and is a documented recall limitation. Tune only after testing. React debounces typing (proposed 500 ms), cancels/discards stale requests, and supports an explicit retry. No suggestions are mandatory to submit an incident.

## Proposed resolution contract

`POST /v1/resolutions/rank` uses the same envelope and query fields. Candidates are closed historical incidents with accepted resolution text, initially the 100 most recent from the same service/category. Each candidate includes incidentId, title, description, and resolutionText. Response uses incidentId, similarityScore, and optional explanation; Spring Boot retrieves and displays authorized resolution text itself.

Suggested resolutions are advisory and require technician review. No result should resolve an incident automatically. A new project may have insufficient history: use clearly identified synthetic demo records, and return an empty successful result when no usable candidates exist.

## Reliability and error contract

- The current adapter uses a two-second connection and request timeout. It makes no synchronous retries that extend UI latency.
- Timeout, malformed response, unknown candidate ID, invalid score, non-200 response, or connection failure maps to HTTP 503 with the normal API error shape: `{"code":"INTELLIGENCE_UNAVAILABLE","message":"Suggestions are temporarily unavailable. You can continue without them.","fieldErrors":[],"requestId":"..."}`.
- Successful responses use `{"status":"AVAILABLE","suggestions":[]}` when no matches are found. An empty candidate list is handled by Spring without calling Python.
- Incident creation, manual assignment, and deterministic priority/SLA rules remain available during outages.
- Keep the Python endpoint internal and authenticated between services; configure secrets outside source control. Exact mechanism depends on deployment.
- Record operational failure metadata without logging private incident text. Mock fixtures support frontend/backend progress before the model is ready.

## Handoff questions for teammates

Confirm transport, schemas, score semantics, candidate limits, model availability, and delivery date. Clarify whether the model requires a separate training dataset or can rank the supplied text immediately. Agree on how model versions are identified and tested with a small shared set of relevant/irrelevant examples. Optional technician intelligence is deferred; the two required Java assignment strategies do not depend on it.
