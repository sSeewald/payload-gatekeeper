import { createCollectionAccess } from '../../access/createCollectionAccess'
import { createMockRequest, createMockUser } from '../helpers/mockPayload'
import type { CollectionConfig } from 'payload'

describe('createCollectionAccess', () => {
  let mockReq: any
  let baseCollection: CollectionConfig

  beforeEach(() => {
    mockReq = createMockRequest()
    // Mock payload.findByID to return the role when it's already an object
    mockReq.payload.findByID = jest.fn().mockImplementation(({ id }) => {
      // Return the role if it's being looked up
      if (typeof id === 'string' && id.startsWith('role-')) {
        return null // Role not found
      }
      // For user roles that are already objects, this shouldn't be called
      // but if it is, return null to trigger permission check on the object itself
      return null
    })
    baseCollection = {
      slug: 'posts',
      fields: [],
    }
  })

  it('should create access control for all CRUD operations', () => {
    const access = createCollectionAccess(baseCollection)

    expect(access).toHaveProperty('create')
    expect(access).toHaveProperty('read')
    expect(access).toHaveProperty('update')
    expect(access).toHaveProperty('delete')
    expect(typeof access.create).toBe('function')
    expect(typeof access.read).toBe('function')
    expect(typeof access.update).toBe('function')
    expect(typeof access.delete).toBe('function')
  })

  it('should wrap existing access functions', () => {
    const originalAccess = {
      create: jest.fn().mockResolvedValue(true),
      read: jest.fn().mockResolvedValue(true),
      update: jest.fn().mockResolvedValue(true),
      delete: jest.fn().mockResolvedValue(true),
    }

    const collectionWithAccess: CollectionConfig = {
      ...baseCollection,
      access: originalAccess,
    }

    const access = createCollectionAccess(collectionWithAccess)

    expect(access.create).not.toBe(originalAccess.create)
    expect(access.read).not.toBe(originalAccess.read)
    expect(access.update).not.toBe(originalAccess.update)
    expect(access.delete).not.toBe(originalAccess.delete)
  })

  it('should check create permission', async () => {
    const user = createMockUser({
      role: {
        permissions: ['posts.create'],
        active: true,
      },
    })
    mockReq.user = user

    const access = createCollectionAccess(baseCollection)
    const result = await (access.create as any)({ req: mockReq })

    expect(result).toBe(true)
  })

  it('should check read permission', async () => {
    const user = createMockUser({
      role: {
        permissions: ['posts.read'],
        active: true,
      },
    })
    mockReq.user = user

    const access = createCollectionAccess(baseCollection)
    const result = await (access.read as any)({ req: mockReq })

    expect(result).toBe(true)
  })

  it('should check update permission', async () => {
    const user = createMockUser({
      role: {
        permissions: ['posts.update'],
        active: true,
      },
    })
    mockReq.user = user

    const access = createCollectionAccess(baseCollection)
    const result = await (access.update as any)({ req: mockReq })

    expect(result).toBe(true)
  })

  it('should check delete permission', async () => {
    const user = createMockUser({
      role: {
        permissions: ['posts.delete'],
        active: true,
      },
    })
    mockReq.user = user

    const access = createCollectionAccess(baseCollection)
    const result = await (access.delete as any)({ req: mockReq })

    expect(result).toBe(true)
  })

  it('should deny access when user lacks specific permission', async () => {
    const user = createMockUser({
      id: '2', // Not the first user
      role: {
        permissions: ['posts.read'], // Only read permission
        active: true,
      },
    })
    mockReq.user = user

    const access = createCollectionAccess(baseCollection)
    
    expect(await (access.create as any)({ req: mockReq })).toBe(false)
    expect(await (access.read as any)({ req: mockReq })).toBe(true)
    expect(await (access.update as any)({ req: mockReq })).toBe(false)
    expect(await (access.delete as any)({ req: mockReq })).toBe(false)
  })

  it('should allow wildcard collection permissions', async () => {
    const user = createMockUser({
      role: {
        permissions: ['posts.*'],
        active: true,
      },
    })
    mockReq.user = user

    const access = createCollectionAccess(baseCollection)
    
    expect(await (access.create as any)({ req: mockReq })).toBe(true)
    expect(await (access.read as any)({ req: mockReq })).toBe(true)
    expect(await (access.update as any)({ req: mockReq })).toBe(true)
    expect(await (access.delete as any)({ req: mockReq })).toBe(true)
  })

  it('should allow wildcard operation permissions', async () => {
    const user = createMockUser({
      id: '2', // Not the first user
      role: {
        permissions: ['*.read'],
        active: true,
      },
    })
    mockReq.user = user

    const access = createCollectionAccess(baseCollection)
    
    expect(await (access.create as any)({ req: mockReq })).toBe(false)
    expect(await (access.read as any)({ req: mockReq })).toBe(true)
    expect(await (access.update as any)({ req: mockReq })).toBe(false)
    expect(await (access.delete as any)({ req: mockReq })).toBe(false)
  })

  it('should allow super admin with * permission', async () => {
    const user = createMockUser({
      role: {
        permissions: ['*'],
        active: true,
      },
    })
    mockReq.user = user

    const access = createCollectionAccess(baseCollection)
    
    expect(await (access.create as any)({ req: mockReq })).toBe(true)
    expect(await (access.read as any)({ req: mockReq })).toBe(true)
    expect(await (access.update as any)({ req: mockReq })).toBe(true)
    expect(await (access.delete as any)({ req: mockReq })).toBe(true)
  })

  it('should respect original access constraints', async () => {
    const queryConstraint = { status: { equals: 'published' } }
    const originalAccess = {
      read: jest.fn().mockResolvedValue(queryConstraint),
    }

    const collectionWithAccess: CollectionConfig = {
      ...baseCollection,
      access: originalAccess,
    }

    const user = createMockUser({
      role: {
        permissions: ['posts.read'],
        active: true,
      },
    })
    mockReq.user = user

    const access = createCollectionAccess(collectionWithAccess)
    const result = await (access.read as any)({ req: mockReq })

    expect(originalAccess.read).toHaveBeenCalled()
    expect(result).toEqual(queryConstraint)
  })

  it('should handle boolean original access values', () => {
    const collectionWithBooleanAccess: CollectionConfig = {
      ...baseCollection,
      access: {
        create: false as any,
        read: true as any,
        update: false as any,
        delete: false as any,
      },
    }

    const access = createCollectionAccess(collectionWithBooleanAccess)

    expect(typeof access.create).toBe('function')
    expect(typeof access.read).toBe('function')
    expect(typeof access.update).toBe('function')
    expect(typeof access.delete).toBe('function')
  })

  it('should handle missing access property', () => {
    const access = createCollectionAccess(baseCollection)

    expect(access).toBeDefined()
    expect(access.create).toBeDefined()
    expect(access.read).toBeDefined()
    expect(access.update).toBeDefined()
    expect(access.delete).toBeDefined()
  })

  it('should handle partial access configuration', () => {
    const collectionWithPartialAccess: CollectionConfig = {
      ...baseCollection,
      access: {
        read: jest.fn().mockResolvedValue(true),
        // Missing create, update, delete
      },
    }

    const access = createCollectionAccess(collectionWithPartialAccess)

    expect(access.create).toBeDefined()
    expect(access.read).toBeDefined()
    expect(access.update).toBeDefined()
    expect(access.delete).toBeDefined()
  })

  describe('auth collection handling', () => {
    it('should deny read access to unauthenticated users for auth collections', async () => {
      const authCollection: CollectionConfig = {
        ...baseCollection,
        slug: 'users',
        auth: true,
      }

      mockReq.user = null // Unauthenticated

      const access = createCollectionAccess(authCollection)
      const result = await (access.read as any)({ req: mockReq })

      expect(result).toBe(false)
    })

    it('should allow read access to authenticated users for auth collections', async () => {
      const authCollection: CollectionConfig = {
        ...baseCollection,
        slug: 'users',
        auth: true,
      }

      const user = createMockUser({
        role: {
          permissions: ['users.read'],
          active: true,
        },
      })
      mockReq.user = user
      mockReq.payload.findByID.mockResolvedValue(user.role)

      const access = createCollectionAccess(authCollection)
      const result = await (access.read as any)({ req: mockReq })

      expect(result).toBe(true)
    })

    it('should check permissions for authenticated users on auth collections', async () => {
      const authCollection: CollectionConfig = {
        ...baseCollection,
        slug: 'users',
        auth: true,
      }

      const user = createMockUser({
        id: '2', // Not the first user so doesn't get automatic access
        role: {
          id: 'test-role',
          name: 'test',
          permissions: ['posts.read'], // No users.read permission
          active: true,
        },
      })
      mockReq.user = user
      mockReq.payload.findByID.mockResolvedValue(user.role)

      const access = createCollectionAccess(authCollection)
      const result = await (access.read as any)({ req: mockReq })

      expect(result).toBe(false)
    })

    it('should respect original read access for auth collections when user is authenticated', async () => {
      const originalReadAccess = jest.fn().mockResolvedValue({ status: { equals: 'active' } })
      const authCollection: CollectionConfig = {
        ...baseCollection,
        slug: 'users',
        auth: { tokenExpiration: 3600 },
        access: {
          read: originalReadAccess,
        },
      }

      const user = createMockUser({
        role: {
          permissions: ['users.read'],
          active: true,
        },
      })
      mockReq.user = user
      mockReq.payload.findByID.mockResolvedValue(user.role)

      const access = createCollectionAccess(authCollection)
      const result = await (access.read as any)({ req: mockReq })

      expect(originalReadAccess).toHaveBeenCalled()
      expect(result).toEqual({ status: { equals: 'active' } })
    })

    it('should not call original read access for auth collections when user is unauthenticated', async () => {
      const originalReadAccess = jest.fn().mockResolvedValue(true)
      const authCollection: CollectionConfig = {
        ...baseCollection,
        slug: 'users',
        auth: true,
        access: {
          read: originalReadAccess,
        },
      }

      mockReq.user = null // Unauthenticated

      const access = createCollectionAccess(authCollection)
      const result = await (access.read as any)({ req: mockReq })

      expect(originalReadAccess).not.toHaveBeenCalled()
      expect(result).toBe(false)
    })
  })

  describe('non-CRUD access methods', () => {
    it('should preserve custom access methods', () => {
      const customAccess = {
        read: jest.fn().mockResolvedValue(true),
        create: jest.fn().mockResolvedValue(true),
        update: jest.fn().mockResolvedValue(true),
        delete: jest.fn().mockResolvedValue(true),
        // Custom methods
        readVersions: jest.fn().mockResolvedValue(true),
        unlock: jest.fn().mockResolvedValue(true),
        custom: jest.fn().mockResolvedValue(true),
      }

      const collectionWithCustomAccess: CollectionConfig = {
        ...baseCollection,
        access: customAccess,
      }

      const access = createCollectionAccess(collectionWithCustomAccess)

      // CRUD methods should be wrapped (different functions)
      expect(access.read).not.toBe(customAccess.read)
      expect(access.create).not.toBe(customAccess.create)
      expect(access.update).not.toBe(customAccess.update)
      expect(access.delete).not.toBe(customAccess.delete)

      // Custom methods should be preserved (same functions)
      expect(access.readVersions).toBe(customAccess.readVersions)
      expect(access.unlock).toBe(customAccess.unlock)
      expect(access.custom).toBe(customAccess.custom)
    })

    it('should handle collections with only custom access methods', () => {
      const customOnlyAccess = {
        readVersions: jest.fn().mockResolvedValue(true),
        unlock: jest.fn().mockResolvedValue(true),
      }

      const collectionWithCustomOnly: CollectionConfig = {
        ...baseCollection,
        access: customOnlyAccess,
      }

      const access = createCollectionAccess(collectionWithCustomOnly)

      // CRUD methods should be created
      expect(access.read).toBeDefined()
      expect(access.create).toBeDefined()
      expect(access.update).toBeDefined()
      expect(access.delete).toBeDefined()

      // Custom methods should be preserved
      expect(access.readVersions).toBe(customOnlyAccess.readVersions)
      expect(access.unlock).toBe(customOnlyAccess.unlock)
    })

    it('should not override CRUD methods when iterating over access keys', () => {
      const mixedAccess = {
        // These should be wrapped
        read: jest.fn().mockResolvedValue(true),
        create: jest.fn().mockResolvedValue(true),
        // These should be preserved
        custom1: jest.fn().mockResolvedValue(true),
        custom2: jest.fn().mockResolvedValue(true),
      }

      const collectionWithMixed: CollectionConfig = {
        ...baseCollection,
        access: mixedAccess,
      }

      const access = createCollectionAccess(collectionWithMixed)

      // Verify wrapped CRUD methods are functions
      expect(typeof access.read).toBe('function')
      expect(typeof access.create).toBe('function')
      expect(access.read).not.toBe(mixedAccess.read)
      expect(access.create).not.toBe(mixedAccess.create)

      // Verify custom methods are preserved
      expect(access.custom1).toBe(mixedAccess.custom1)
      expect(access.custom2).toBe(mixedAccess.custom2)
    })
  })
})