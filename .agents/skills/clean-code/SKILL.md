---
name: Clean Code & Architecture Standards
description: Comprehensive guide for maintaining a professional, scalable, and maintainable codebase using TypeScript, ElysiaJS, and Hexagonal Architecture.
---

# Advanced Clean Code & Architecture Standards

This skill defines the "Gold Standard" for code quality in this project. It goes beyond basic syntax to cover architectural integrity, maintainability, and robustness.

## 1. Core Principles (The "Why")

*   **SOLID**: Strictly adhere to SOLID principles.
    *   **S**ingle Responsibility: One class/module, one reason to change.
    *   **O**pen/Closed: Open for extension, closed for modification.
    *   **L**iskov Substitution: Subtypes must be substitutable for their base types.
    *   **I**nterface Segregation: Clients shouldn't depend on interfaces they don't use.
    *   **D**ependency Inversion: Depend on abstractions, not concretions.
*   **DRY (Don't Repeat Yourself)**: Extract usage patterns into reusable functions/components.
*   **KISS (Keep It Simple, Stupid)**: Avoid over-engineering. Complexity is a liability.
*   **YAGNI (You Ain't Gonna Need It)**: Do not implement features "just in case".

## 2. TypeScript Mastery

*   **No `any`**: The usage of `any` is strictly forbidden. Use `unknown` if the type is truly uncertain, and narrow it down with type guards.
*   **Strict Null Checks**: Do not rely on implicit usage of `null` or `undefined`. Handle them explicitly.
*   **Explicit Return Types**: All functions (esp. exported ones) must have explicit return types to prevent accidental API changes.
*   **Interfaces over Types**: Use `interface` for public APIs and object shapes (better error messages, extensible). Use `type` for unions, intersections, and primitives.
*   **Immutability**: Prefer `readonly` properties and `ReadonlyArray<T>` where data should not be mutated.

## 3. Naming Conventions

*   **Classes/Interfaces/Types**: `PascalCase` (e.g., `UserRepository`, `PaymentService`).
*   **Variables/Functions/Methods**: `camelCase` (e.g., `calculateTotal`, `isValid`).
*   **Constants**: `UPPER_SNAKE_CASE` (only for true compile-time constants, e.g., `MAX_RETRY_COUNT`).
*   **Booleans**: Must answer a yes/no question. Prefix with `is`, `has`, `can`, `should`.
    *   *Bad*: `valid`, `active`
    *   *Good*: `isValid`, `isActive`, `shouldRetry`
*   **Files**: `PascalCase` for Classes/Components, `camelCase` for utilities/functions. Match the export name.

## 4. Architecture & Structure (Hexagonal/DDD)

*   **Dependency Rule**: Outer layers (Infrastructure) depend on inner layers (Core/Application). Inner layers **never** import from outer layers.
    *   `core/`: Domain Entities, Value Objects, Repository Interfaces. **No external dependencies** (except minimal libs like `uuid` or utility types).
    *   `modules/` (Application): Use Cases, Services. Orchestrates data flow.
    *   `infrastructure/`: Database implementations, API Controllers (Elysia), External Services.
*   **Value Objects**: Encapsulate primitive validation logic in Value Objects (e.g., `Email`, `Money`, `ReferenceCode`) instead of passing raw strings/numbers.

## 5. Functions & Methods

*   **Small & Focused**: A function should do one thing well. if it's longer than 20-30 lines, consider breaking it up.
*   **Argument Limit**: Max 3 arguments. If more are needed, use a configuration object (Request Object pattern).
*   **Early Returns**: Use Guard Clauses to handle edge cases/errors early at the top of the function to avoid deep nesting (Arrow Code).

    ```typescript
    // Bad
    if (user) {
        if (user.isActive) {
           // logic
        }
    }

    // Good
    if (!user || !user.isActive) return;
    // logic
    ```

## 6. Error Handling

*   **No Silent Failures**: Never use empty `catch` blocks.
*   **Custom Errors**: Use domain-specific error classes (e.g., `UserNotFoundError`, `InsufficientFundsError`) instead of generic `Error`.
*   **Centralized Handling**: Rely on Elysia's `onError` or a global error handler for transforming exceptions into HTTP responses. Do not manually format HTTP responses in Use Cases.

## 7. Async & Performance

*   **Async/Await**: Always use `async/await` instead of `.then()`.
*   **Parallel Execution**: Use `Promise.all()` when operations are independent. Don't `await` in a loop sequentially if they can run concurrently.
*   **Database Queries**: Select only the fields you need. Avoid `select *` in production critical paths.

## 8. Testing (The Safety Net)

*   **AAA Pattern**: Arrange, Act, Assert.
*   **Test Behavior, Not Implementation**: Tests should not break if you refactor internal logic without changing behavior.
*   **Unit Tests**: For Core logic and Use Cases. Mock repositories.
*   **Integration Tests**: For Infrastructure/Controllers to verify DB/API contracts.

## 9. Cleanup & Routine

*   **Boy Scout Rule**: Always leave the code cleaner than you found it. If you see unused imports, dead code, or bad variable names, fix them immediately.
*   **Remove Dead Code**: Commented-out code (aka "Zombie Code") is forbidden. We have Git for history. Delete it.

---

**How to use this skill:**
1.  Read this before starting a complex task.
2.  During code review (self or others), check against these points.
3.  If you find a violation, fix it or ask the user for permission to fix it.
