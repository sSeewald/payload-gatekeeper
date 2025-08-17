import { createAccessWrapper } from '../../access/createAccessWrapper'
import { createMockRequest, createMockUser } from '../helpers/mockPayload'

describe('createAccessWrapper', () => {
  let mockReq: any
  let mockOriginalAccess: any

  beforeEach(() => {
    mockReq = createMockRequest()
    mockOriginalAccess = jest.fn()
  })

  it('should return false when no user is present (requires auth)', async () => {
    const wrapper = createAccessWrapper('posts', 'read')
    const result = await wrapper({ req: mockReq })
    
    expect(result).toBe(false)
  })

  it('should check permission when user has role object', async () => {
    const user = createMockUser({
      role: {
        id: '1',
        permissions: ['posts.read'],
        active: true,
      },
    })
    mockReq.user = user

    const wrapper = createAccessWrapper('posts', 'read')
    const result = await wrapper({ req: mockReq })
    
    expect(result).toBe(true)
  })

  it('should deny access when user lacks permission', async () => {
    const user = createMockUser({
      id: '2', // Not the first user
      role: {
        id: '1',
        permissions: ['posts.write'],
        active: true,
      },
    })
    mockReq.user = user

    const wrapper = createAccessWrapper('posts', 'read')
    const result = await wrapper({ req: mockReq })
    
    expect(result).toBe(false)
  })

  it('should call original access function when provided', async () => {
    mockOriginalAccess.mockResolvedValue(true)
    const user = createMockUser({
      role: {
        id: '1',
        permissions: ['posts.read'],
        active: true,
      },
    })
    mockReq.user = user

    const wrapper = createAccessWrapper('posts', 'read', mockOriginalAccess)
    const args = { req: mockReq }
    const result = await wrapper(args)
    
    expect(mockOriginalAccess).toHaveBeenCalledWith(args)
    expect(result).toBe(true)
  })

  it('should deny access if original access function denies', async () => {
    mockOriginalAccess.mockResolvedValue(false)
    const user = createMockUser({
      role: {
        id: '1',
        permissions: ['posts.read'],
        active: true,
      },
    })
    mockReq.user = user

    const wrapper = createAccessWrapper('posts', 'read', mockOriginalAccess)
    const result = await wrapper({ req: mockReq })
    
    expect(result).toBe(false)
  })

  it('should deny access if permission check fails even if original allows', async () => {
    mockOriginalAccess.mockResolvedValue(true)
    const user = createMockUser({
      id: '2', // Not the first user
      role: {
        id: '1',
        permissions: ['posts.write'], // Wrong permission
        active: true,
      },
    })
    mockReq.user = user

    const wrapper = createAccessWrapper('posts', 'read', mockOriginalAccess)
    const result = await wrapper({ req: mockReq })
    
    expect(result).toBe(false)
  })

  it('should handle user with role ID string', async () => {
    const user = createMockUser({
      id: '2', // Not the first user
      role: 'role-id-123',
    })
    mockReq.user = user
    mockReq.payload.findByID.mockResolvedValue({
      id: 'role-id-123',
      permissions: ['posts.read'],
      active: true,
    })

    const wrapper = createAccessWrapper('posts', 'read')
    const result = await wrapper({ req: mockReq })
    
    expect(mockReq.payload.findByID).toHaveBeenCalledWith({
      collection: 'roles',
      id: 'role-id-123',
      depth: 0,
    })
    expect(result).toBe(true)
  })

  it('should handle user without role field', async () => {
    const user = { id: '2', email: 'test@example.com' } // Not the first user
    mockReq.user = user

    const wrapper = createAccessWrapper('posts', 'read')
    const result = await wrapper({ req: mockReq })
    
    expect(result).toBe(false)
  })

  it('should handle query constraints from original access', async () => {
    const queryConstraints = { status: { equals: 'published' } }
    mockOriginalAccess.mockResolvedValue(queryConstraints)
    
    const user = createMockUser({
      role: {
        permissions: ['posts.read'],
        active: true,
      },
    })
    mockReq.user = user

    const wrapper = createAccessWrapper('posts', 'read', mockOriginalAccess)
    const result = await wrapper({ req: mockReq })
    
    expect(result).toEqual(queryConstraints)
  })

  it('should handle errors in original access function', async () => {
    mockOriginalAccess.mockRejectedValue(new Error('Access check failed'))
    
    const user = createMockUser({
      role: {
        id: '1',
        name: 'editor',
        permissions: ['posts.read'],
        active: true,
      },
    })
    mockReq.user = user

    const wrapper = createAccessWrapper('posts', 'read', mockOriginalAccess)
    
    await expect(wrapper({ req: mockReq })).rejects.toThrow('Access check failed')
  })

  it('should handle super admin with * permission', async () => {
    const user = createMockUser({
      role: {
        id: '1',
        name: 'super_admin',
        permissions: ['*'],
        active: true,
      },
    })
    mockReq.user = user

    const wrapper = createAccessWrapper('any-collection', 'read')
    const result = await wrapper({ req: mockReq })
    
    expect(result).toBe(true)
  })

  it('should work with boolean original access', async () => {
    const user = createMockUser({
      role: {
        id: '1',
        name: 'editor',
        permissions: ['posts.read'],
        active: true,
      },
    })
    mockReq.user = user

    // Test with function that returns true
    const trueAccess = jest.fn().mockResolvedValue(true)
    let wrapper = createAccessWrapper('posts', 'read', trueAccess)
    let result = await wrapper({ req: mockReq })
    expect(result).toBe(true)

    // Test with function that returns false
    const falseAccess = jest.fn().mockResolvedValue(false)
    wrapper = createAccessWrapper('posts', 'read', falseAccess)
    result = await wrapper({ req: mockReq })
    expect(result).toBe(false)
  })
})