# Repository Agents & Skills

## Project Overview

Condominio API Server is a backend API for a mobile application built with **Bun**, **ElysiaJS**, and **Supabase**. It follows **Clean Architecture** with strict separation of concerns.

### Architecture Layers
- **Core:** Configuration, Logger, Shared Errors.
- **Infrastructure:** Supabase Client, Storage Service.
- **Modules:** Business features (Auth, Users, Buildings, Payments, Dashboard).

## Available Skills

| Skill | Description | URL |
|-------|-------------|-----|
| `ddd-implementation` | Patterns for Entities, Value Objects, Aggregates | [SKILL.md](skills/ddd-implementation/SKILL.md) |
| `hexagonal-architecture` | Layers and dependency rules for Hexagonal Architecture | [SKILL.md](skills/hexagonal-architecture/SKILL.md) |

## Implementation Guidelines

When implementing new features, always refer to these skills to ensure consistency with the project's architectural standards.

### Domain-Driven Design
Refer to `ddd-implementation` for:
- Creating new Domain Entities.
- Structuring Aggregates.
- Validation logic in Value Objects.

### Hexagonal Architecture
Refere to `hexagonal-architecture` for:
- Placing files in the correct directory `domain`, `application`, `infrastructure`.
- Implementing Repository interfaces.
- Controller and Use Case interaction.
