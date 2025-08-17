import { createAfterReadHook } from '../../hooks/afterReadHook'
import { createMockRole } from '../helpers/mockPayload'

// Mock getRolesSlug
jest.mock('../../utils/getRolesSlug', () => ({
  getRolesSlug: () => 'roles'
}))

describe('createAfterReadHook', () => {
  it('should populate role when role is a string ID', async () => {
    const mockRole = createMockRole()
    const mockReq = {
      payload: {
        findByID: jest.fn().mockResolvedValue(mockRole)
      }
    }

    const doc = {
      id: 1,
      email: 'test@example.com',
      role: 'role-id-123'
    }

    const hook = createAfterReadHook()
    const result = await hook({ doc, req: mockReq })

    expect(mockReq.payload.findByID).toHaveBeenCalledWith({
      collection: 'roles',
      id: 'role-id-123',
      depth: 0
    })

    expect(result.role).toEqual(mockRole)
  })

  it('should populate role when role is a number ID', async () => {
    const mockRole = createMockRole()
    const mockReq = {
      payload: {
        findByID: jest.fn().mockResolvedValue(mockRole)
      }
    }

    const doc = {
      id: 1,
      email: 'test@example.com',
      role: 123
    }

    const hook = createAfterReadHook()
    const result = await hook({ doc, req: mockReq })

    expect(mockReq.payload.findByID).toHaveBeenCalledWith({
      collection: 'roles',
      id: '123',
      depth: 0
    })

    expect(result.role).toEqual(mockRole)
  })

  it('should not populate role when role is already an object', async () => {
    const mockRole = createMockRole()
    const mockReq = {
      payload: {
        findByID: jest.fn()
      }
    }

    const doc = {
      id: 1,
      email: 'test@example.com',
      role: mockRole
    }

    const hook = createAfterReadHook()
    const result = await hook({ doc, req: mockReq })

    expect(mockReq.payload.findByID).not.toHaveBeenCalled()
    expect(result.role).toEqual(mockRole)
  })

  it('should not populate role when role is null', async () => {
    const mockReq = {
      payload: {
        findByID: jest.fn()
      }
    }

    const doc = {
      id: 1,
      email: 'test@example.com',
      role: null
    }

    const hook = createAfterReadHook()
    const result = await hook({ doc, req: mockReq })

    expect(mockReq.payload.findByID).not.toHaveBeenCalled()
    expect(result.role).toBeNull()
  })

  it('should handle role population errors gracefully', async () => {
    const mockReq = {
      payload: {
        findByID: jest.fn().mockRejectedValue(new Error('Database error'))
      }
    }

    const doc = {
      id: 1,
      email: 'test@example.com',
      role: 'invalid-role-id'
    }

    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()

    const hook = createAfterReadHook()
    const result = await hook({ doc, req: mockReq })

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'Could not populate role in afterRead:',
      expect.any(Error)
    )

    // Role should remain as ID if population fails
    expect(result.role).toBe('invalid-role-id')

    consoleWarnSpy.mockRestore()
  })

  it('should return doc unchanged when doc is undefined', async () => {
    const mockReq = {
      payload: {
        findByID: jest.fn()
      }
    }

    const hook = createAfterReadHook()
    const result = await hook({ doc: undefined, req: mockReq })

    expect(mockReq.payload.findByID).not.toHaveBeenCalled()
    expect(result).toBeUndefined()
  })

  it('should return doc unchanged when doc is null', async () => {
    const mockReq = {
      payload: {
        findByID: jest.fn()
      }
    }

    const hook = createAfterReadHook()
    const result = await hook({ doc: null, req: mockReq })

    expect(mockReq.payload.findByID).not.toHaveBeenCalled()
    expect(result).toBeNull()
  })
})