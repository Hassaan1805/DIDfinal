// Test environment setup
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-unit-tests-minimum-32-chars';
process.env.CHALLENGE_STORAGE_TYPE = 'memory';
process.env.DEMO_MODE = 'false';
process.env.ADMIN_TOKEN = 'test-admin-token-minimum-32-characters-long';
process.env.ADMIN_ALLOW_STATIC_TOKENS = 'true';
