"""End-to-end check through Spring Boot: React-equivalent calls -> Spring -> Python ranker.

Seeds a fresh ITSM database with SYNTHETIC history through the public REST API (no direct database
writes), then checks duplicate and resolution suggestions for each role.

    # stack running (compose.e2e.yaml), from intelligence/:
    ITSM_URL=http://localhost:8080 BOOTSTRAP_ADMIN_EMAIL=... BOOTSTRAP_ADMIN_PASSWORD=... \
        .venv/Scripts/python -m scripts.e2e_spring            # seed + suggestion checks
    ... .venv/Scripts/python -m scripts.e2e_spring --outage   # run after stopping the Python service

Credentials come from the environment and are never printed. Generated test-user passwords are random
per run. Exit code 0 = every check passed.
"""

import argparse
import json
import os
import secrets
import sys
import uuid

import httpx

from scripts.dataset import load

BASE = os.environ.get("ITSM_URL", "http://localhost:8080").rstrip("/") + "/api/v1"
RESULTS: list[tuple[bool, str]] = []
STATE_FILE = os.path.join(os.path.dirname(__file__), "..", ".e2e_state.json")


def check(ok: bool, label: str, detail: object = "") -> bool:
    RESULTS.append((ok, label))
    print(f"[{'PASS' if ok else 'FAIL'}] {label}" + (f"  -> {detail}" if detail != "" else ""))
    return ok


class Session:
    def __init__(self, email: str, password: str):
        self.http = httpx.Client(base_url=BASE, timeout=30)
        self.email = email
        self._csrf()
        r = self.http.post("/auth/login", data={"email": email, "password": password}, headers=self.headers)
        if r.status_code >= 400:
            raise SystemExit(f"login failed for a {email.split('@')[0]} account: HTTP {r.status_code}")
        self._csrf()
        self.me = self.http.get("/auth/me").json()

    def _csrf(self):
        c = self.http.get("/auth/csrf").json()
        self.headers = {c["headerName"]: c["token"]}

    def get(self, path):
        return self.http.get(path)

    def post(self, path, body):
        return self.http.post(path, json=body, headers=self.headers)

    def patch(self, path, body):
        return self.http.patch(path, json=body, headers=self.headers)

    def ok(self, method, path, body=None):
        r = getattr(self, method)(path, body) if body is not None else getattr(self, method)(path)
        if r.status_code >= 400:
            raise SystemExit(f"{method.upper()} {path} failed: HTTP {r.status_code} {r.text[:300]}")
        return r.json() if r.content else {}


def anonymous_post(path, body):
    s = httpx.Client(base_url=BASE, timeout=30)
    c = s.get("/auth/csrf").json()
    return s.post(path, json=body, headers={c["headerName"]: c["token"]})


def new_user(admin: Session, role: str | None, name: str) -> tuple[str, str]:
    email = f"e2e-{name}-{uuid.uuid4().hex[:8]}@example.test"
    password = secrets.token_urlsafe(18)
    body = {"displayName": f"E2E {name}", "email": email, "password": password}
    if role:
        admin.ok("post", "/admin/users", {**body, "role": role})
    else:
        r = anonymous_post("/auth/register", body)
        if r.status_code >= 400:
            raise SystemExit(f"register failed: HTTP {r.status_code} {r.text[:200]}")
    return email, password


def version(s: Session, incident_id: str) -> int:
    return s.ok("get", f"/incidents/{incident_id}")["version"]


def act(s: Session, incident_id: str, action: str, **fields):
    return s.ok("post", f"/incidents/{incident_id}/{action}", {"version": version(s, incident_id), **fields})


def report(s: Session, ex, service_id: str, category_id: str) -> str:
    i = ex.incident
    return s.ok("post", "/incidents", {
        "title": i.title, "description": i.description, "serviceId": service_id,
        "categoryId": category_id, "impact": 2, "urgency": 2,
    })["id"]


def seed() -> dict:
    admin = Session(os.environ["BOOTSTRAP_ADMIN_EMAIL"], os.environ["BOOTSTRAP_ADMIN_PASSWORD"])
    check(admin.me.get("role") == "ADMIN", "bootstrap administrator can log in")
    tag = uuid.uuid4().hex[:6]
    skill = admin.ok("post", "/admin/skills", {"name": f"E2E support {tag}", "active": True})["id"]
    service = admin.ok("post", "/admin/services", {"name": f"E2E Workplace IT {tag}",
                                                   "description": "Synthetic E2E service", "criticality": 2,
                                                   "active": True})["id"]
    targets = {p: {"responseSeconds": 3600, "resolutionSeconds": 86400} for p in ("P1", "P2", "P3", "P4")}
    admin.ok("post", f"/admin/services/{service}/sla-policies", {"targets": targets})

    examples = load()
    raw = json.loads(open(os.path.join(os.path.dirname(__file__), "..", "data", "synthetic_incidents.json"),
                          encoding="utf-8").read())
    names = sorted({c["category"] for c in raw["clusters"]} | {s["category"] for s in raw["singletons"]})
    categories = {n: admin.ok("post", "/admin/categories",
                              {"name": f"E2E {n} {tag}", "active": True, "requirements": {skill: 1}})["id"]
                  for n in names}
    # Map each synthetic title to the Spring category created for its category name.
    category_of = {title: categories[g["category"]] for g in raw["clusters"] for title, _ in g["incidents"]}
    category_of.update({s["title"]: categories[s["category"]] for s in raw["singletons"]})

    tech_email, tech_pw = new_user(admin, "TECHNICIAN", "tech")
    tech_id = next(u["id"] for u in admin.ok("get", "/admin/users") if u["email"] == tech_email)
    admin.ok("patch", f"/admin/technicians/{tech_id}",
             {"available": True, "capacity": 50, "experienceMonths": 24, "skills": {skill: 5}})
    emp_email, emp_pw = new_user(admin, None, "employee")
    emp2_email, emp2_pw = new_user(admin, None, "employee2")
    tech, emp = Session(tech_email, tech_pw), Session(emp_email, emp_pw)

    def assign(incident_id):
        admin.ok("post", f"/incidents/{incident_id}/assignments", {
            "version": version(admin, incident_id), "technicianId": tech_id, "strategy": "SKILL_FIRST",
            "reason": "E2E assignment"})

    # History: first incident of every cluster + singletons, resolved and closed with the cluster's fix.
    clusters: dict[str, list] = {}
    for ex in examples:
        clusters.setdefault(ex.cluster or f"single-{ex.incident.title}", []).append(ex)
    closed = {}
    for key, members in clusters.items():
        ex = members[0]
        iid = report(emp, ex, service, category_of[ex.incident.title])
        assign(iid)
        act(tech, iid, "acknowledge")
        act(tech, iid, "start-investigation")
        act(tech, iid, "resolutions", details=ex.incident.resolution_text)
        act(admin, iid, "verify", note="Verified by E2E")
        act(admin, iid, "close", note="Closed by E2E")
        closed[key] = iid
    check(len(closed) == len(clusters), f"seeded {len(closed)} closed incidents with accepted resolutions")

    # Active incidents (duplicate candidates): second paraphrase of 4 clusters.
    active = {}
    for key in ("vpn-certificate", "printer", "payment-checkout", "email-sync"):
        active[key] = report(emp, clusters[key][1], service, category_of[clusters[key][1].incident.title])
    check(True, f"seeded {len(active)} active incidents", "")

    # A new VPN ticket assigned to the technician, for resolution suggestions.
    open_vpn = report(emp, clusters["vpn-certificate"][3], service,
                      category_of[clusters["vpn-certificate"][3].incident.title])
    assign(open_vpn)

    state = {"service": service, "categories": categories, "closed": closed, "active": active,
             "open_vpn": open_vpn, "users": {"tech": [tech_email, tech_pw], "emp": [emp_email, emp_pw],
                                             "emp2": [emp2_email, emp2_pw]},
             "vpn_draft": clusters["vpn-certificate"][2].incident.model_dump(mode="json"),
             "vpn_category": categories["Network"]}
    with open(STATE_FILE, "w", encoding="utf-8") as f:
        json.dump(state, f)
    return state


def sessions(state):
    admin = Session(os.environ["BOOTSTRAP_ADMIN_EMAIL"], os.environ["BOOTSTRAP_ADMIN_PASSWORD"])
    return (admin, Session(*state["users"]["tech"]), Session(*state["users"]["emp2"]))


def draft(state, title, description):
    return {"title": title, "description": description, "serviceId": state["service"],
            "categoryId": state["vpn_category"]}


def suggestion_checks(state):
    admin, tech, emp2 = sessions(state)
    d = state["vpn_draft"]
    vpn_draft = draft(state, d["title"], d["description"])
    # Both open VPN tickets are true duplicates of the draft; other clusters must not be suggested.
    vpn_open = {state["active"]["vpn-certificate"], state["open_vpn"]}

    r = admin.post("/incident-suggestions/duplicates", vpn_draft)
    body = r.json()
    ids = [s.get("incidentId") for s in body.get("suggestions", [])]
    check(r.status_code == 200 and body.get("status") == "AVAILABLE", "admin duplicate check returns AVAILABLE",
          r.status_code)
    check(set(ids) == vpn_open, "admin: exactly the two open VPN incidents are suggested",
          [(s.get("incidentId", "")[:8], s.get("similarityScore")) for s in body.get("suggestions", [])])
    check(body.get("modelVersion") == "tfidf-wc-v1", "admin response carries Python modelVersion",
          body.get("modelVersion"))

    for who, s in (("employee", emp2), ("technician", tech)):
        r = s.post("/incident-suggestions/duplicates", vpn_draft)
        sug = r.json().get("suggestions", []) if r.status_code == 200 else []
        check(r.status_code == 200 and len(sug) >= 1, f"{who}: duplicate notice shown", r.status_code)
        check(all("incidentId" not in x and "explanation" not in x for x in sug),
              f"{who}: no other incident IDs or text exposed", sug[:1])

    r = admin.post("/incident-suggestions/duplicates",
                   draft(state, "Office chair broken", "The gas lift on my desk chair no longer works."))
    check(r.status_code == 200 and r.json().get("suggestions") == [], "unrelated draft gets no duplicates",
          r.json().get("suggestions"))

    vpn = state["open_vpn"]
    r = tech.get(f"/incidents/{vpn}/resolution-suggestions")
    sug = r.json().get("suggestions", []) if r.status_code == 200 else []
    check(r.status_code == 200 and bool(sug) and sug[0]["incidentId"] == state["closed"]["vpn-certificate"],
          "technician: top resolution comes from the closed VPN incident",
          [(x["incidentId"][:8], x["similarityScore"]) for x in sug])
    check(bool(sug) and "certificate" in (sug[0].get("resolutionText") or "").lower(),
          "technician: accepted resolution text is shown", (sug[0].get("resolutionText") if sug else None))
    r = admin.get(f"/incidents/{vpn}/resolution-suggestions")
    check(r.status_code == 200 and bool(r.json().get("suggestions")), "admin: resolution suggestions available")
    emp = Session(*state["users"]["emp"])
    r = emp.get(f"/incidents/{vpn}/resolution-suggestions")
    check(r.status_code == 403, "employee: resolution suggestions forbidden", r.status_code)

    # Known issue probe: a CLOSED incident is its own candidate (no `i.id <> :self` filter in Spring).
    closed_vpn = state["closed"]["vpn-certificate"]
    r = admin.get(f"/incidents/{closed_vpn}/resolution-suggestions")
    ids = [x["incidentId"] for x in r.json().get("suggestions", [])] if r.status_code == 200 else []
    check(closed_vpn not in ids, "closed incident does not suggest itself",
          "self-match returned" if closed_vpn in ids else "")


def outage_checks(state):
    admin, tech, emp2 = sessions(state)
    d = state["vpn_draft"]
    r = emp2.post("/incident-suggestions/duplicates", draft(state, d["title"], d["description"]))
    check(r.status_code == 503 and r.json().get("code") == "INTELLIGENCE_UNAVAILABLE",
          "Python down: duplicate check returns 503 INTELLIGENCE_UNAVAILABLE", (r.status_code, r.json().get("code")))
    r = tech.get(f"/incidents/{state['open_vpn']}/resolution-suggestions")
    check(r.status_code == 503, "Python down: resolution suggestions return 503", r.status_code)
    r = emp2.post("/incidents", {**draft(state, "Monitor flickers", "Second monitor flickers."),
                                 "impact": 1, "urgency": 1})
    check(r.status_code == 201, "Python down: reporting an incident still works", r.status_code)
    iid = r.json().get("id")
    r = admin.post(f"/incidents/{iid}/assignment-recommendations", {})
    check(r.status_code == 200, "Python down: assignment recommendations still work", r.status_code)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--outage", action="store_true", help="checks to run after stopping the Python service")
    args = parser.parse_args()
    if args.outage:
        with open(STATE_FILE, encoding="utf-8") as f:
            outage_checks(json.load(f))
    else:
        suggestion_checks(seed())
    failed = [label for ok, label in RESULTS if not ok]
    print(f"\n{len(RESULTS) - len(failed)}/{len(RESULTS)} checks passed")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
