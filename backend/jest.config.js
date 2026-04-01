/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: [
    'src/services/**/*.ts',
    '!src/services/blockchainService.ts',
    '!src/services/SepoliaService.ts',
    '!src/services/redis.service.ts',
  ],
  coverageDirectory: 'coverage',
  setupFiles: ['<rootDir>/src/__tests__/setup.ts'],
};
