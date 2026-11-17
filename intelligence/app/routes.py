import logging
import time
from typing import Annotated

from fastapi import APIRouter, Depends, Request

from app.config import Settings, get_settings
from app.rankers import Ranker
from app.rankers.base import select_top
from app.schemas import DuplicateRankRequest, RankResponse, ResolutionRankRequest
from app.security import require_token

log = logging.getLogger("intelligence")

public = APIRouter()
v1 = APIRouter(prefix="/v1", dependencies=[Depends(require_token)])


def get_ranker(request: Request) -> Ranker:
    return request.app.state.ranker


RankerDep = Annotated[Ranker, Depends(get_ranker)]
SettingsDep = Annotated[Settings, Depends(get_settings)]


def _log(kind: str, request_id: str, candidates: int, response: RankResponse, started: float):
    # Never log incident text: only identifiers, counts, and timings.
    log.info(
        "rank kind=%s requestId=%s candidates=%d results=%d topScore=%s ms=%.1f",
        kind,
        request_id,
        candidates,
        len(response.results),
        response.results[0].similarity_score if response.results else None,
        (time.perf_counter() - started) * 1000,
    )


@public.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@v1.get("/model-info")
def model_info(ranker: RankerDep, settings: SettingsDep) -> dict[str, object]:
    return {
        "modelVersion": ranker.model_version,
        "duplicateMinScore": settings.duplicate_min_score,
        "resolutionMinScore": settings.resolution_min_score,
    }


# Plain `def` (not async): ranking is CPU work, so FastAPI runs it in its thread pool.
@v1.post("/duplicates/rank", response_model=RankResponse, response_model_exclude_none=True)
def rank_duplicates(body: DuplicateRankRequest, ranker: RankerDep, settings: SettingsDep):
    started = time.perf_counter()
    scored = ranker.score_duplicates(body.query, body.candidates) if body.candidates else []
    response = RankResponse(
        request_id=body.request_id,
        model_version=ranker.model_version,
        results=select_top(scored, body.limit, settings.duplicate_min_score),
    )
    _log("duplicates", body.request_id, len(body.candidates), response, started)
    return response


@v1.post("/resolutions/rank", response_model=RankResponse, response_model_exclude_none=True)
def rank_resolutions(body: ResolutionRankRequest, ranker: RankerDep, settings: SettingsDep):
    started = time.perf_counter()
    scored = ranker.score_resolutions(body.query, body.candidates) if body.candidates else []
    response = RankResponse(
        request_id=body.request_id,
        model_version=ranker.model_version,
        results=select_top(scored, body.limit, settings.resolution_min_score),
    )
    _log("resolutions", body.request_id, len(body.candidates), response, started)
    return response
