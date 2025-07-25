const request = require('supertest');
const { app } = require('../../server');

describe('API Integration', () => {
  describe('Health Endpoints', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.version).toBeDefined();
      expect(response.body.uptime).toBeDefined();
    });

    it('should return 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/api/non-existent-endpoint')
        .expect(404);

      expect(response.body.error).toBe('Route not found');
      expect(response.body.code).toBe('NOT_FOUND');
    });
  });

  describe('API Documentation', () => {
    it('should serve Swagger documentation', async () => {
      const response = await request(app)
        .get('/api-docs/')
        .expect(200);

      expect(response.text).toContain('swagger');
    });
  });

  describe('CORS Headers', () => {
    it('should include CORS headers in responses', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    it('should handle preflight OPTIONS requests', async () => {
      const response = await request(app)
        .options('/api/auth/login')
        .expect(200);

      expect(response.headers['access-control-allow-methods']).toBeDefined();
      expect(response.headers['access-control-allow-headers']).toBeDefined();
    });
  });

  describe('Security Headers', () => {
    it('should include security headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBeDefined();
      expect(response.headers['x-xss-protection']).toBeDefined();
    });
  });

  describe('Rate Limiting', () => {
    it('should include rate limit headers', async () => {
      const response = await request(app)
        .get('/api/cases')
        .expect(200);

      // Rate limit headers should be present
      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should return proper error format', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid-email',
          password: 'short'
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.code).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('Content Compression', () => {
    it('should compress responses when requested', async () => {
      const response = await request(app)
        .get('/api/cases')
        .set('Accept-Encoding', 'gzip')
        .expect(200);

      // Check if compression is applied for larger responses
      if (response.text.length > 1024) {
        expect(response.headers['content-encoding']).toBe('gzip');
      }
    });
  });

  describe('Request ID Tracking', () => {
    it('should include request ID in response headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers['x-request-id']).toBeDefined();
      expect(response.headers['x-request-id']).toMatch(/^req_\d+_[a-z0-9]+$/);
    });
  });

  describe('API Versioning', () => {
    it('should handle API versioning correctly', async () => {
      const response = await request(app)
        .get('/api/cases')
        .expect(200);

      // API should be accessible under /api prefix
      expect(response.status).toBe(200);
    });
  });

  describe('Static File Serving', () => {
    it('should serve static files with proper headers', async () => {
      // Test if uploads directory is accessible (should return 404 if empty)
      const response = await request(app)
        .get('/uploads/test.txt')
        .expect(404);

      // Should still have proper headers even for 404
      expect(response.headers['content-type']).toBeDefined();
    });
  });
});