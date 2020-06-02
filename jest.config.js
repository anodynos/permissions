module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testRegex: '(/__tests__/.*\\.(test|spec))\\.ts?$',
  coverageDirectory: 'coverage',
  collectCoverageFrom: ['src/**/*.{ts,tsx,js,jsx}', '!src/**/*.d.ts'],
  // reporters: [['jest-md-reporter', { color: false }]],
  reporters: [['jest-standard-reporter', { color: false }]],
  setupFilesAfterEnv: ['jest-extended', './jest.SetupFilesAfterEnv.js'],
};
