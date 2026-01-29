import { describe, expect, it } from 'bun:test';
import { app } from '../src/app';

describe('Health Check', () => {
    it('should return 200 OK', async () => {
        const response = await app.handle(new Request('http://localhost/health'));
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body).toHaveProperty('status', 'ok');
        expect(body).toHaveProperty('timestamp');
    });
});
