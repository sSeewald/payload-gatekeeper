import { createCollectionAccess } from '../../access/createCollectionAccess'
import { createMockRequest, createMockUser } from '../helpers/mockPayload'
import type { CollectionConfig } from 'payload'

describe('createCollectionAccess', () => {
  let mockReq: any
  let baseCollection: CollectionConfig

  beforeEach(() => {
    mockReq = createMockRequest()
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
})