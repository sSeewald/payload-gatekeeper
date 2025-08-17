import { createAfterLoginHook } from '../../hooks/afterLoginHook'
import { createMockRole } from '../helpers/mockPayload'

// Mock getRolesSlug
jest.mock('../../utils/getRolesSlug', () => ({
  getRolesSlug: () => 'roles'
}))

describe('createAfterLoginHook', () => {
  it('should populate role when role is a string ID', async () => {
    const mockRole = createMockRole()
    const mockReq = {
      payload: {
        findByID: jest.fn().mockResolvedValue(mockRole)
      }
    }

    const user = {
      id: 1,
      email: 'test@example.com',
      role: 'role-id-123'
    }

    const hook = createAfterLoginHook()
    const result = await hook({ user, req: mockReq })

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

    const user = {
      id: 1,
      email: 'test@example.com',
      role: 123
    }

    const hook = createAfterLoginHook()
    const result = await hook({ user, req: mockReq })

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

    const user = {
      id: 1,
      email: 'test@example.com',
      role: mockRole
    }

    const hook = createAfterLoginHook()
    const result = await hook({ user, req: mockReq })

    expect(mockReq.payload.findByID).not.toHaveBeenCalled()
    expect(result.role).toEqual(mockRole)
  })

  it('should not populate role when role is null', async () => {
    const mockReq = {
      payload: {
        findByID: jest.fn()
      }
    }

    const user = {
      id: 1,
      email: 'test@example.com',
      role: null
    }

    const hook = createAfterLoginHook()
    const result = await hook({ user, req: mockReq })

    expect(mockReq.payload.findByID).not.toHaveBeenCalled()
    expect(result.role).toBeNull()
  })

  it('should handle role population errors gracefully', async () => {
    const mockReq = {
      payload: {
        findByID: jest.fn().mockRejectedValue(new Error('Database error'))
      }
    }

    const user = {
      id: 1,
      email: 'test@example.com',
      role: 'invalid-role-id'
    }

    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()

    const hook = createAfterLoginHook()
    const result = await hook({ user, req: mockReq })

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'Could not populate role in afterLogin:',
      expect.any(Error)
    )

    // Role should remain as ID if population fails
    expect(result.role).toBe('invalid-role-id')

    consoleWarnSpy.mockRestore()
  })

  it('should return user unchanged when user is undefined', async () => {
    const mockReq = {
      payload: {
        findByID: jest.fn()
      }
    }

    const hook = createAfterLoginHook()
    const result = await hook({ user: undefined, req: mockReq })

    expect(mockReq.payload.findByID).not.toHaveBeenCalled()
    expect(result).toBeUndefined()
  })
})