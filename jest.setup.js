// Suppress console outputs during tests
global.console = {
  ...console,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}

// Mock Payload module and its error classes
jest.mock('payload', () => {
  // Create mock error classes that match Payload's error structure
  class ValidationError extends Error {
    constructor(options) {
      super(options.errors?.[0]?.message || 'Validation error')
      this.name = 'ValidationError'
      this.errors = options.errors || []
      this.collection = options.collection
    }
  }

  class Forbidden extends Error {
    constructor(message) {
      super(message || 'Forbidden')
      this.name = 'Forbidden'
    }
  }

  return {
    ValidationError,
    Forbidden,
  }
})