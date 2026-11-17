"""Loads data/synthetic_incidents.json into contract objects with stable fake UUIDs."""

import json
import uuid
from dataclasses import dataclass
from pathlib import Path

from app.schemas import Query, ResolutionCandidate

DATA = Path(__file__).resolve().parent.parent / "data" / "synthetic_incidents.json"
_NS = uuid.UUID("00000000-0000-4000-8000-00000000a11e")
SERVICE_ID = uuid.uuid5(_NS, "service:demo")


@dataclass(frozen=True)
class Example:
    incident: ResolutionCandidate
    cluster: str | None  # None = singleton: has no true duplicate in the set

    def as_query(self) -> Query:
        return Query(title=self.incident.title, description=self.incident.description,
                     service_id=self.incident.service_id, category_id=self.incident.category_id)


def _example(key: str, cluster: str | None, category: str, title: str, description: str, resolution: str):
    return Example(
        ResolutionCandidate(
            incident_id=uuid.uuid5(_NS, key), title=title, description=description,
            service_id=SERVICE_ID, category_id=uuid.uuid5(_NS, "category:" + category),
            resolution_text=resolution,
        ),
        cluster,
    )


def load() -> list[Example]:
    raw = json.loads(DATA.read_text(encoding="utf-8"))
    examples = []
    for group in raw["clusters"]:
        for n, (title, description) in enumerate(group["incidents"]):
            examples.append(_example(f"{group['cluster']}:{n}", group["cluster"], group["category"],
                                     title, description, group["resolution"]))
    for n, s in enumerate(raw["singletons"]):
        examples.append(_example(f"singleton:{n}", None, s["category"], s["title"], s["description"],
                                 s["resolution"]))
    return examples
