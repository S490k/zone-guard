/**
 * Jest configuration for the Firestore security-rule tests alone.
 *
 * These tests drive the real Firebase SDK against the emulator, so they cannot
 * share the main configuration: the jest-expo preset replaces Node's `fetch`,
 * which the rules-testing library needs to find the emulator, and
 * `__tests__/setup.ts` mocks `firebase/app` and `firebase/firestore` for the unit
 * suite. Under the main configuration these tests could not pass even with an
 * emulator running. Here they run in plain Node with the genuine SDK.
 *
 *   npm run test:rules
 */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/__tests__/integration/**/*.test.ts'],
  transform: { '^.+\\.[jt]sx?$': 'babel-jest' },
  moduleNameMapper: {
    '.*/postinstall\\.mjs$': '<rootDir>/node_modules/@firebase/util/dist/postinstall.js',
  },
};
