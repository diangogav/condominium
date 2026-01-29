import { describe, it, expect } from 'bun:test';

describe('E2E Tests - Health Check', () => {
    it('GET /health - should return OK', async () => {
        const response = await fetch('http://localhost:3000/health');
        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data).toHaveProperty('status', 'ok');
        expect(data).toHaveProperty('timestamp');
    });
});

describe('E2E Tests - Buildings (Public)', () => {
    it('GET /buildings - should return list of buildings', async () => {
        const response = await fetch('http://localhost:3000/buildings');
        expect(response.status).toBe(200);

        const data = await response.json();
        expect(Array.isArray(data)).toBe(true);
    });
});

describe('E2E Tests - Auth Flow', () => {
    it('POST /auth/register - should validate required fields', async () => {
        const response = await fetch('http://localhost:3000/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });

        // Elysia uses 422 for validation errors
        expect(response.status).toBe(422);
    });

    it('POST /auth/login - should validate required fields', async () => {
        const response = await fetch('http://localhost:3000/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });

        // Elysia uses 422 for validation errors
        expect(response.status).toBe(422);
    });
});

describe('E2E Tests - Protected Endpoints (Without Auth)', () => {
    it('GET /users/me - should return 401 without token', async () => {
        const response = await fetch('http://localhost:3000/users/me');
        expect(response.status).toBe(401);
    });

    it('GET /payments - should return 401 without token', async () => {
        const response = await fetch('http://localhost:3000/payments');
        expect(response.status).toBe(401);
    });

    it('GET /dashboard/summary - should return 401 without token', async () => {
        const response = await fetch('http://localhost:3000/dashboard/summary');
        expect(response.status).toBe(401);
    });

    it('PATCH /users/me - should return 401 without token', async () => {
        const response = await fetch('http://localhost:3000/users/me', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Test' })
        });
        expect(response.status).toBe(401);
    });
});

// Note: Tests with real authentication require a running Supabase instance
// For CI/CD, use environment variables to point to a test Supabase project
// or use Supabase local development with `supabase start`
