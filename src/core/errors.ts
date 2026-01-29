export class DomainError extends Error {
    constructor(public override message: string, public code: string, public status: number) {
        super(message);
    }
}

export class ValidationError extends DomainError {
    constructor(message: string) {
        super(message, 'VALIDATION_ERROR', 400);
    }
}

export class NotFoundError extends DomainError {
    constructor(message: string) {
        super(message, 'NOT_FOUND', 404);
    }
}

export class UnauthorizedError extends DomainError {
    constructor(message: string) {
        super(message, 'UNAUTHORIZED', 401);
    }
}
