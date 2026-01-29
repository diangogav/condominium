import { Elysia } from 'elysia';
import { swagger } from '@elysiajs/swagger';
import { logger } from './core/logger';
import { DomainError } from './core/errors';
import { randomUUID } from 'crypto';

export const app = new Elysia()
    .use(swagger())
    .derive(({ request }) => {
        return {
            requestId: request.headers.get('x-request-id') || randomUUID()
        };
    })
    .onAfterHandle(({ request, set, requestId }) => {
        logger.info({
            type: 'request',
            method: request.method,
            url: request.url,
            status: set.status,
            requestId: requestId
        });
    })
    .onError(({ code, error, set }) => {
        logger.error({
            type: 'error',
            code,
            error: (error as Error).message,
            stack: (error as Error).stack
        });

        if (error instanceof DomainError) {
            set.status = error.status;
            return {
                code: error.code,
                message: error.message
            };
        }

        if (code === 'NOT_FOUND') {
            set.status = 404;
            return {
                code: 'NOT_FOUND',
                message: 'Resource not found'
            };
        }

        if (code === 'VALIDATION') {
            set.status = 400;
            return {
                code: 'VALIDATION_ERROR',
                // @ts-ignore
                message: error.validator?.Errors(error.value).next().value || error.message
            }
        }

        set.status = 500;
        return {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Internal Server Error'
        };
    })
    .get('/health', () => ({ status: 'ok', timestamp: new Date().toISOString() }));
