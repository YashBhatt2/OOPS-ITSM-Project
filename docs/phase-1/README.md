# Phase 1 design package

Status: original design package. Backend source and a migration now exist; see [implementation decisions](../implementation.md) for adopted defaults and contract differences, and [validation results](../validation-results.md) for verification limits.

- [Requirements and business rules](requirements.md): scope, permissions, lifecycle, acceptance evidence, and pending decisions.
- [Domain and database design](domain.md): architecture, use cases, class/ER sketches, data dictionary, and constraints.
- [Frontend API contract](api.md): routes, representative payloads, errors, filters, and dashboard definitions.
- [Intelligence integration contract](intelligence.md): proposed Python interface, candidate data, failures, and team handoff.
- [Validation scenarios](validation.md): planned test cases and three demonstration workflows.

Read these as a proposed implementation contract, not a claim that endpoints exist. API examples are fixtures for discussion and frontend mock development. The Python team must confirm its interface. Framework versions, installation, migrations, and application code belong to later phases.

## Confirmed during phase 1

- Assignment recommendations require administrator confirmation. There is no automatic technician assignment in the initial scope.
- Employees may reopen their own closed incidents within seven days, with a reason. Preserve previous SLA history and begin a new service cycle.

## Review before implementation

See the numbered proposals in requirements.md. In particular, confirm authentication/deployment with the frontend team and the intelligence transport with the Python team. Neither blocks review of the core domain model.
