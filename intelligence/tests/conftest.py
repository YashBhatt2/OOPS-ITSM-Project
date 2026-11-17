import copy
import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app

FIXTURES = Path(__file__).parent / "fixtures"


def load(name: str) -> dict:
    return copy.deepcopy(json.loads((FIXTURES / name).read_text(encoding="utf-8")))


def make_client(**settings) -> TestClient:
    return TestClient(create_app(settings=Settings(_env_file=None, **settings)))


@pytest.fixture
def client():
    with make_client() as c:
        yield c


@pytest.fixture
def duplicate_request() -> dict:
    return load("duplicate_request.json")


@pytest.fixture
def resolution_request() -> dict:
    return load("resolution_request.json")
