import pytest

from tests.conftest import make_client

TOKEN = "test-shared-token"


@pytest.fixture
def secured():
    with make_client(intelligence_token=TOKEN) as c:
        yield c


@pytest.mark.parametrize("headers", [{}, {"Authorization": "Bearer wrong"}, {"Authorization": TOKEN}])
def test_rank_rejects_missing_or_wrong_token(secured, duplicate_request, headers):
    response = secured.post("/v1/duplicates/rank", json=duplicate_request, headers=headers)
    assert response.status_code == 401


def test_rank_accepts_correct_token(secured, duplicate_request):
    response = secured.post(
        "/v1/duplicates/rank", json=duplicate_request, headers={"Authorization": f"Bearer {TOKEN}"}
    )
    assert response.status_code == 200


def test_model_info_requires_token(secured):
    assert secured.get("/v1/model-info").status_code == 401
    info = secured.get("/v1/model-info", headers={"Authorization": f"Bearer {TOKEN}"}).json()
    assert info["modelVersion"]


def test_health_needs_no_token(secured):
    assert secured.get("/health").json() == {"status": "ok"}


def test_no_token_configured_allows_local_calls(client, duplicate_request):
    assert client.post("/v1/duplicates/rank", json=duplicate_request).status_code == 200


def test_docs_can_be_disabled():
    with make_client(enable_docs=False) as c:
        assert c.get("/docs").status_code == 404
        assert c.get("/openapi.json").status_code == 404
