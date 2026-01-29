# Testing Guide

## Overview

This project includes End-to-End (E2E) tests that validate API endpoints without requiring database mocking. Tests run against a live server instance.

## Running Tests

### Prerequisites

1. **Start the development server**:
   ```bash
   bun dev
   ```

2. **Ensure Supabase is configured** with valid credentials in `.env`

### Run All Tests

```bash
bun test
```

### Run E2E Tests Only

```bash
bun test:e2e
```

## Test Structure

### Current Test Coverage

- ✅ **Health Check** - Server availability
- ✅ **Public Endpoints** - Buildings list (no auth required)
- ✅ **Validation** - Request body validation on auth endpoints
- ✅ **Authentication** - Protected endpoints return 401 without token
- ✅ **Authorization** - Token-based access control

### Test Files

- `tests/e2e.test.ts` - End-to-end API tests

## Test Philosophy

### No Database Mocking

Tests run against the **real Supabase instance** configured in your environment. This approach:

- ✅ Tests real integration with Supabase
- ✅ Validates RLS policies and database constraints
- ✅ Catches configuration issues early
- ❌ Requires a running Supabase instance
- ❌ May create test data in your database

### CI/CD Considerations

For continuous integration, you have two options:

#### Option 1: Supabase Local Development (Recommended)

```bash
# Start local Supabase instance
supabase start

# Run tests against local instance
bun test

# Stop local instance
supabase stop
```

#### Option 2: Dedicated Test Project

Create a separate Supabase project for testing:

1. Create a new Supabase project (e.g., `condominio-test`)
2. Set up environment variables for CI:
   ```bash
   SUPABASE_URL=https://your-test-project.supabase.co
   SUPABASE_ANON_KEY=your-test-anon-key
   ```
3. Run migrations before tests:
   ```bash
   bun run db:migration:up
   bun test
   ```

## Writing New Tests

### Example: Testing a Protected Endpoint

```typescript
import { describe, it, expect } from 'bun:test';

describe('My Feature', () => {
    it('should require authentication', async () => {
        const response = await fetch('http://localhost:3000/my-endpoint');
        expect(response.status).toBe(401);
    });

    it('should work with valid token', async () => {
        const response = await fetch('http://localhost:3000/my-endpoint', {
            headers: {
                'Authorization': 'Bearer YOUR_VALID_TOKEN'
            }
        });
        expect(response.status).toBe(200);
    });
});
```

### Best Practices

1. **Test behavior, not implementation** - Focus on API contracts
2. **Use descriptive test names** - Clearly state what is being tested
3. **Test edge cases** - Invalid inputs, missing auth, etc.
4. **Keep tests isolated** - Each test should be independent
5. **Clean up test data** - If creating data, clean it up after tests

## Docker Compose Testing

You can run tests in a containerized environment:

### Option 1: Test Against Running Container

```bash
# Start the API container
docker-compose up -d

# Wait for server to be ready
sleep 5

# Run tests against container
bun test

# Stop container
docker-compose down
```

### Option 2: Add Test Service to docker-compose.yml

```yaml
services:
  api:
    # ... existing config ...

  test:
    build: .
    command: bun test
    environment:
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
    depends_on:
      - api
```

Then run:

```bash
docker-compose run test
```

## Troubleshooting

### Tests Fail with Connection Errors

**Problem**: Cannot connect to `http://localhost:3000`

**Solution**: Ensure the dev server is running:
```bash
bun dev
```

### Tests Fail with 500 Errors

**Problem**: Server errors during test execution

**Solutions**:
1. Check server logs for error details
2. Verify `.env` configuration
3. Ensure database migrations are applied
4. Check Supabase project status

### Validation Errors (422 vs 400)

Elysia uses **422 Unprocessable Entity** for validation errors, not 400. Update your tests accordingly:

```typescript
// ✅ Correct
expect(response.status).toBe(422);

// ❌ Incorrect
expect(response.status).toBe(400);
```

## Future Improvements

- [ ] Add integration tests for payment file uploads
- [ ] Add tests for admin-specific endpoints
- [ ] Add performance/load testing
- [ ] Add test data fixtures
- [ ] Add database cleanup utilities
- [ ] Add authentication helper utilities for tests
