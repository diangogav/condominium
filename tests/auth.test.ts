import { describe, expect, it, mock } from 'bun:test';
import { app } from '../src/app';

// Mock dependencies would be ideal, but due to direct instantiation in routes.ts, 
// we are integration testing the "happy path" logic mostly or we need to spy on prototype.
// For now, we accept that without a DI container, deep mocking is harder.
// However, since we set SUPABASE_URL to mock, it won't hit real backend but likely fail on "URL not found" 
// or similar if we don't mock the internal network calls.

// Better strategy for this phase: verify the route structure and validation.
// The real logic depends on Supabase which we can't easily mock globally without DI.
// But we can check if validation works.

describe('Auth Module Integration', () => {
    it('GET /auth/register should fail with 404 (Method Not Allowed actually but route not found for GET)', async () => {
        const response = await app.handle(new Request('http://localhost/auth/register'));
        expect(response.status).toBe(404);
    });

    it('POST /auth/register should fail validation with empty body', async () => {
        const response = await app.handle(new Request('http://localhost/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        }));

        expect(response.status).toBe(422); // Validation error
    });

    it('POST /auth/register should fail validation with invalid email', async () => {
        const response = await app.handle(new Request('http://localhost/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Test',
                email: 'not-an-email',
                password: 'pass', // too short
                unit: '101',
                building_id: '123'
            })
        }));

        expect(response.status).toBe(422);
    });
});
