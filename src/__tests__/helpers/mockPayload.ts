
import type { Payload } from 'payload'
import type { RoleDocument } from '../../types'

export const createMockPayload = (overrides?: Partial<Payload>): Payload => {
  return {
    find: jest.fn(),
    findByID: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateByID: jest.fn(),
    delete: jest.fn(),
    deleteByID: jest.fn(),
    count: jest.fn(),
    login: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
    unlock: jest.fn(),
    verifyEmail: jest.fn(),
    config: {
      collections: [],
      globals: [],
      admin: {
        user: 'backend-users',
      },
      serverURL: 'http://localhost:3000',
      routes: {
        api: '/api',
        admin: '/admin',
      },
    },
    ...overrides,
  } as unknown as Payload
}

interface MockRequest {
  user: unknown
  payload: ReturnType<typeof createMockPayload>
  context: Record<string, unknown>
  headers: Record<string, string>
  [key: string]: unknown
}

export const createMockRequest = (overrides?: Partial<MockRequest>): MockRequest => {
  return {
    user: null,
    payload: createMockPayload(),
    context: {},
    headers: {},
    ...overrides,
  }
}

interface MockUser {
  id: string
  email: string
  role?: Partial<RoleDocument> | string
  [key: string]: unknown
}

export const createMockUser = (overrides?: Partial<MockUser>): MockUser => {
  return {
    id: '1',
    email: 'test@example.com',
    role: {
      id: '1',
      name: 'admin',
      permissions: ['*'],
    },
    ...overrides,
  }
}

export const createMockRole = (overrides?: Partial<RoleDocument>): RoleDocument => {
  return {
    id: '1',
    name: 'test-role',
    label: 'Test Role',
    permissions: [],
    active: true,
    protected: false,
    ...overrides,
  }
}