"""The response rules Spring's IntelligenceClient enforces; any violation becomes a 503 there."""

import json
import math
import uuid

import pytest

ROUTES = [("/v1/duplicates/rank", "duplicate_request"), ("/v1/resolutions/rank", "resolution_request")]


def _assert_contract(request: dict, response) -> dict:
    assert response.status_code == 200, response.text
    assert len(response.content) <= 100_000
    body = response.json()
    assert set(body) <= {"requestId", "schemaVersion", "modelVersion", "results"}
    assert body["requestId"] == request["requestId"]
    assert body["schemaVersion"] == "1"
    assert isinstance(body["modelVersion"], str) and body["modelVersion"]
    results = body["results"]
    assert len(results) <= min(request.get("limit", 5), 5)
    candidate_ids = {c["incidentId"] for c in request["candidates"]}
    ids = [r["incidentId"] for r in results]
    assert len(ids) == len(set(ids))
    assert set(ids) <= candidate_ids
    scores = [r["similarityScore"] for r in results]
    assert all(math.isfinite(s) and 0 <= s <= 1 for s in scores)
    assert scores == sorted(scores, reverse=True)
    for r in results:
        assert set(r) <= {"incidentId", "similarityScore", "explanation"}
        uuid.UUID(r["incidentId"])
    return body


@pytest.mark.parametrize("route,fixture", ROUTES)
def test_readme_example_satisfies_contract(client, request, route, fixture):
    payload = request.getfixturevalue(fixture)
    body = _assert_contract(payload, client.post(route, json=payload))
    assert body["results"], "the related example should match"
    assert body["results"][0]["incidentId"] == payload["candidates"][0]["incidentId"]


@pytest.mark.parametrize("route,fixture", ROUTES)
def test_unrelated_candidate_is_not_returned(client, request, route, fixture):
    payload = request.getfixturevalue(fixture)
    body = _assert_contract(payload, client.post(route, json=payload))
    assert payload["candidates"][1]["incidentId"] not in {r["incidentId"] for r in body["results"]}


@pytest.mark.parametrize("route,fixture", ROUTES)
def test_empty_candidates_is_successful_empty_result(client, request, route, fixture):
    payload = request.getfixturevalue(fixture)
    payload["candidates"] = []
    assert _assert_contract(payload, client.post(route, json=payload))["results"] == []


@pytest.mark.parametrize("limit", [1, 2, 5])
def test_limit_is_respected(client, duplicate_request, limit):
    template = duplicate_request["candidates"][0]
    duplicate_request["candidates"] = [
        {**template, "incidentId": str(uuid.uuid4())} for _ in range(10)
    ]
    duplicate_request["limit"] = limit
    body = _assert_contract(duplicate_request, client.post("/v1/duplicates/rank", json=duplicate_request))
    assert len(body["results"]) == limit


def test_ties_keep_candidate_order(client, duplicate_request):
    template = duplicate_request["candidates"][0]
    ids = [str(uuid.uuid4()) for _ in range(3)]
    duplicate_request["candidates"] = [{**template, "incidentId": i} for i in ids]
    body = client.post("/v1/duplicates/rank", json=duplicate_request).json()
    assert [r["incidentId"] for r in body["results"]] == ids


def test_duplicate_candidate_ids_returned_once(client, duplicate_request):
    duplicate_request["candidates"].append(duplicate_request["candidates"][0])
    _assert_contract(duplicate_request, client.post("/v1/duplicates/rank", json=duplicate_request))


@pytest.mark.parametrize(
    "title,description",
    [("", ""), ("!!!", "???"), ("Payment service unavailable", "Checkout fails when submitting a payment")],
)
def test_degenerate_and_identical_text_scores_stay_in_range(client, duplicate_request, title, description):
    duplicate_request["candidates"][0].update(title=title, description=description)
    _assert_contract(duplicate_request, client.post("/v1/duplicates/rank", json=duplicate_request))


def test_worst_case_size_and_count(client, duplicate_request):
    template = duplicate_request["candidates"][0]
    duplicate_request["query"]["title"] = "payment " * 25
    duplicate_request["query"]["description"] = "checkout payment failure " * 400
    duplicate_request["candidates"] = [
        {**template, "incidentId": str(uuid.uuid4()), "title": "payment " * 25,
         "description": "checkout payment failure " * 400}
        for _ in range(100)
    ]
    _assert_contract(duplicate_request, client.post("/v1/duplicates/rank", json=duplicate_request))


@pytest.mark.parametrize(
    "mutate",
    [
        lambda p: p.update(schemaVersion="2"),
        lambda p: p.pop("requestId"),
        lambda p: p["query"].pop("title"),
        lambda p: p["query"].update(serviceId="not-a-uuid"),
        lambda p: p.update(limit=0),
        lambda p: p.update(limit=6),
        lambda p: p["query"].update(title="x" * 201),
        lambda p: p.update(candidates=[p["candidates"][0]] * 101),
    ],
    ids=["schema-version", "no-request-id", "no-title", "bad-uuid", "limit-0", "limit-6",
         "title-too-long", "too-many-candidates"],
)
def test_invalid_requests_are_rejected(client, duplicate_request, mutate):
    mutate(duplicate_request)
    assert client.post("/v1/duplicates/rank", json=duplicate_request).status_code == 422


def test_resolution_candidates_require_resolution_text(client, resolution_request):
    resolution_request["candidates"][0].pop("resolutionText")
    assert client.post("/v1/resolutions/rank", json=resolution_request).status_code == 422


def test_uppercase_uuids_from_spring_are_accepted_and_echoed_as_uuids(client, duplicate_request):
    duplicate_request["candidates"][0]["incidentId"] = duplicate_request["candidates"][0]["incidentId"].upper()
    body = client.post("/v1/duplicates/rank", json=duplicate_request).json()
    assert uuid.UUID(body["results"][0]["incidentId"]) == uuid.UUID(duplicate_request["candidates"][0]["incidentId"])


def test_response_is_camel_case_json(client, duplicate_request):
    raw = client.post("/v1/duplicates/rank", json=duplicate_request).text
    assert "similarityScore" in raw and "similarity_score" not in raw
    json.loads(raw)
