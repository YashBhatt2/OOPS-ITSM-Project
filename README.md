# Intelligent IT Service Management (I-ITSM)

A web-based service desk built for the Object-Oriented Programming course at BITS Pilani, Hyderabad Campus. Employees report IT issues, technicians investigate and record fixes, and administrators assign tickets and verify resolutions. The app tracks response and resolution deadlines, flags possible duplicate reports, and suggests fixes from past incidents.

[Project report (PDF)](docs/project-report.pdf) · [Local setup](RUNNING.md)

## Codebase

| Directory | Contents |
| --- | --- |
| [frontend-react](frontend-react/) | React and TypeScript web app |
| [backend](backend/) | Spring Boot REST API and PostgreSQL migrations |
| [domain](domain/) | Java rules for priority, assignment, and incident lifecycles |
| [intelligence](intelligence/) | Python service for duplicate and resolution suggestions |

See the [design notes](docs/phase-1/domain.md) for the architecture, UML diagrams, and database schema, and the [validation results](docs/validation-results.md) for test coverage.
