# Intelligent IT Service Management

Employees report service incidents, technicians investigate and record fixes, and administrators assign work and verify resolutions. The service desk tracks response and resolution deadlines, keeps an audit history, and suggests related reports and previously accepted fixes.

## Run locally

Follow the [local setup guide](RUNNING.md) to configure PostgreSQL, start Spring Boot and the Python ranking service, and open the React app.

## Project

| Directory | Contents |
| --- | --- |
| `frontend-react/` | React and TypeScript website |
| `frontend/` | Earlier lightweight web client |
| `domain/` | Java rules for priority, assignment, incident transitions, and deadlines |
| `backend/` | Spring Boot API, authentication, scheduled jobs, and PostgreSQL migrations |
| `intelligence/` | Python ranking service, evaluation data, and tests |

## Assignment documentation

- [Requirements and business rules](docs/phase-1/requirements.md)
- [Architecture, UML, and database design](docs/phase-1/domain.md)
- [Implementation decisions](docs/implementation.md)
- [Validation scenarios](docs/phase-1/validation.md) and [recorded results](docs/validation-results.md)
