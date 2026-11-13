"""ITSM intelligence service: ranks duplicate and resolution candidates for Spring Boot.

Run: uvicorn app.main:app --host 127.0.0.1 --port 8000
"""

import logging
from contextlib import asynccontextmanager
from uuid import UUID

from fastapi import FastAPI

from app.config import Settings, get_settings
from app.rankers import Ranker, build_ranker
from app.routes import public, v1
from app.schemas import Candidate, Query

log = logging.getLogger("intelligence")


def _warm_up(ranker: Ranker) -> None:
    ranker.warm_up()
    zero = UUID(int=0)
    sample = Query(title="warm up", description="warm up", service_id=zero, category_id=zero)
    ranker.score_duplicates(sample, [Candidate(**sample.model_dump(), incident_id=zero)])


def create_app(ranker: Ranker | None = None, settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
        if not settings.intelligence_token:
            log.warning("INTELLIGENCE_TOKEN is not set: /v1 routes accept unauthenticated calls")
        _warm_up(app.state.ranker)
        log.info("ready modelVersion=%s", app.state.ranker.model_version)
        yield

    docs = settings.enable_docs
    app = FastAPI(
        title="ITSM Intelligence",
        version="0.1.0",
        lifespan=lifespan,
        docs_url="/docs" if docs else None,
        redoc_url=None,
        openapi_url="/openapi.json" if docs else None,
    )
    app.state.ranker = ranker or build_ranker(settings.ranker)
    app.include_router(public)
    app.include_router(v1)
    app.dependency_overrides[get_settings] = lambda: settings
    return app


app = create_app()
