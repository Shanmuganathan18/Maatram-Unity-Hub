/**
 * tests/health.test.js
 * Test the health check endpoint.
 */
const request = require('supertest');
const app = require('../src/app');

describe('GET /health', () => {
  it('should return 200 and healthy status', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe('healthy');
    expect(res.body.service).toContain('Maatram');
  });

  it('should return 404 for unknown API routes', async () => {
    const res = await request(app).get('/api/v1/unknown-endpoint-404');
    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('NOT_FOUND');
  });
});

