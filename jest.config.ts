import type {Config} from 'jest';

const config: Config = {
  preset: 'ts-jest',
  clearMocks: true,
  collectCoverage: true,
  coverageDirectory: 'coverage',
  testEnvironment: 'jsdom',
  modulePathIgnorePatterns: ['<rootDir>/lib/'],
};

export default config;
