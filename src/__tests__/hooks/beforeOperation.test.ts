import { createBeforeOperationHook } from '../../hooks/beforeOperation'
import { createMockRequest, createMockUser, createMockRole } from '../helpers/mockPayload'
import type { GatekeeperOptions } from '../../types'

describe('createBeforeOperationHook', () => {
  let mockReq: any
  let consoleWarnSpy: any
  let consoleInfoSpy: any

  beforeEach(() => {
    jest.clearAllMocks()
    mockReq = createMockRequest()
    
    // Spy on console methods
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => {})
    
    // Suppress console.error during tests
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('basic functionality', () => {
    it('should allow access when user has permission', async () => {
      const hook = createBeforeOperationHook()
      
      const role = createMockRole({
        id: 'role-1',
        permissions: ['posts.read', 'posts.create'],
        active: true,
      })
      
      const user = createMockUser({
        id: '2',
        email: 'user@example.com',
        role,
      })
      mockReq.user = user

      const args = {
        req: mockReq,
        collection: 'posts',
        operation: 'read',
      }

      const result = await hook({ args, operation: 'read' })
      
      expect(result).toBe(args)
    })

    it('should deny access when user lacks permission', async () => {
      const hook = createBeforeOperationHook()
      
      const role = createMockRole({
        id: 'role-1',
        permissions: ['posts.read'], // Only read, no create
        active: true,
      })
      
      const user = createMockUser({
        id: '2',
        email: 'user@example.com',
        role,
      })
      mockReq.user = user

      const args = {
        req: mockReq,
        collection: 'posts',
        operation: 'create',
      }

      await expect(hook({ args, operation: 'create' })).rejects.toThrow(
        "Permission denied: You don't have create access to posts"
      )
    })

    it('should allow super admin with * permission', async () => {
      const hook = createBeforeOperationHook()
      
      const role = createMockRole({
        id: 'super-admin',
        permissions: ['*'],
        active: true,
      })
      
      const user = createMockUser({
        id: '2',
        email: 'admin@example.com',
        role,
      })
      mockReq.user = user

      // Super admin should be able to do everything
      const operations = ['create', 'read', 'update', 'delete']
      const collections = ['posts', 'users', 'sensitive-data']
      
      for (const collection of collections) {
        for (const operation of operations) {
          const args = {
            req: mockReq,
            collection,
            operation,
          }
          
          const result = await hook({ args, operation })
          expect(result).toBe(args)
        }
      }
    })

    it('should handle wildcard collection permissions', async () => {
      const hook = createBeforeOperationHook()
      
      const role = createMockRole({
        permissions: ['posts.*'], // All operations on posts
        active: true,
      })
      
      const user = createMockUser({
        id: '2',
        role,
      })
      mockReq.user = user

      // Should allow all operations on posts
      const operations = ['create', 'read', 'update', 'delete']
      for (const operation of operations) {
        const args = {
          req: mockReq,
          collection: 'posts',
          operation,
        }
        
        const result = await hook({ args, operation })
        expect(result).toBe(args)
      }
      
      // But should deny on other collections
      const args = {
        req: mockReq,
        collection: 'users',
        operation: 'read',
      }
      
      await expect(hook({ args, operation: 'read' })).rejects.toThrow()
    })

    it('should handle wildcard operation permissions', async () => {
      const hook = createBeforeOperationHook()
      
      const role = createMockRole({
        permissions: ['*.read'], // Read on all collections
        active: true,
      })
      
      const user = createMockUser({
        id: '2',
        role,
      })
      mockReq.user = user

      // Should allow read on all collections
      const collections = ['posts', 'users', 'media']
      for (const collection of collections) {
        const args = {
          req: mockReq,
          collection,
          operation: 'read',
        }
        
        const result = await hook({ args, operation: 'read' })
        expect(result).toBe(args)
      }
      
      // But should deny other operations
      const args = {
        req: mockReq,
        collection: 'posts',
        operation: 'create',
      }
      
      await expect(hook({ args, operation: 'create' })).rejects.toThrow()
    })

    it('should deny access for inactive role', async () => {
      const hook = createBeforeOperationHook()
      
      const role = createMockRole({
        permissions: ['posts.*'],
        active: false, // Inactive role
      })
      
      const user = createMockUser({
        id: '2',
        role,
      })
      mockReq.user = user

      const args = {
        req: mockReq,
        collection: 'posts',
        operation: 'read',
      }

      await expect(hook({ args, operation: 'read' })).rejects.toThrow()
    })
  })

  describe('skip conditions', () => {
    it('should skip check for excluded collections', async () => {
      const options: GatekeeperOptions = {
        excludeCollections: ['public-posts'],
      }
      const hook = createBeforeOperationHook(options)
      
      // User without any permissions
      const user = createMockUser({
        id: '2',
        role: createMockRole({ permissions: [] }),
      })
      mockReq.user = user
      
      const args = {
        req: mockReq,
        collection: 'public-posts',
        operation: 'read',
      }

      // Should allow even without permissions because collection is excluded
      const result = await hook({ args, operation: 'read' })
      expect(result).toBe(args)
    })

    it('should skip check during seeding mode', async () => {
      const options: GatekeeperOptions = {
        seedingMode: true,
      }
      const hook = createBeforeOperationHook(options)
      
      // User without permissions
      const user = createMockUser({
        id: '2',
        role: createMockRole({ permissions: [] }),
      })
      mockReq.user = user
      
      const args = {
        req: mockReq,
        collection: 'posts',
        operation: 'create',
      }

      // Should allow even without permissions during seeding
      const result = await hook({ args, operation: 'create' })
      expect(result).toBe(args)
    })

    it('should skip check when skipPermissionChecks is true', async () => {
      const options: GatekeeperOptions = {
        skipPermissionChecks: true,
      }
      const hook = createBeforeOperationHook(options)
      
      // User without permissions
      const user = createMockUser({
        id: '2',
        role: createMockRole({ permissions: [] }),
      })
      mockReq.user = user
      
      const args = {
        req: mockReq,
        collection: 'posts',
        operation: 'delete',
      }

      const result = await hook({ args, operation: 'delete' })
      expect(result).toBe(args)
    })

    it('should skip check when skipPermissionChecks function returns true', async () => {
      const options: GatekeeperOptions = {
        skipPermissionChecks: () => true,
      }
      const hook = createBeforeOperationHook(options)
      
      // User without permissions
      const user = createMockUser({
        id: '2',
        role: createMockRole({ permissions: [] }),
      })
      mockReq.user = user
      
      const args = {
        req: mockReq,
        collection: 'posts',
        operation: 'update',
      }

      const result = await hook({ args, operation: 'update' })
      expect(result).toBe(args)
    })

    it('should not skip when skipPermissionChecks function returns false', async () => {
      const options: GatekeeperOptions = {
        skipPermissionChecks: () => false,
      }
      const hook = createBeforeOperationHook(options)
      
      // User without permissions
      const user = createMockUser({
        id: '2',
        role: createMockRole({ permissions: [] }),
      })
      mockReq.user = user
      
      const args = {
        req: mockReq,
        collection: 'posts',
        operation: 'update',
      }

      await expect(hook({ args, operation: 'update' })).rejects.toThrow()
    })

    it('should skip check when no user is present', async () => {
      const hook = createBeforeOperationHook()
      
      const args = {
        req: { ...mockReq, user: null },
        collection: 'posts',
        operation: 'read',
      }

      const result = await hook({ args, operation: 'read' })
      expect(result).toBe(args)
    })

    it('should skip check when user has no role', async () => {
      const hook = createBeforeOperationHook()
      
      const user = { id: '2', email: 'user@example.com' } // No role field
      const args = {
        req: { ...mockReq, user },
        collection: 'posts',
        operation: 'read',
      }

      const result = await hook({ args, operation: 'read' })
      expect(result).toBe(args)
    })

    it('should skip check when user role is null', async () => {
      const hook = createBeforeOperationHook()
      
      const user = { id: '2', email: 'user@example.com', role: null }
      const args = {
        req: { ...mockReq, user },
        collection: 'posts',
        operation: 'read',
      }

      const result = await hook({ args, operation: 'read' })
      expect(result).toBe(args)
    })
  })

  describe('audit logging', () => {
    it('should log successful access when audit is enabled', async () => {
      const options: GatekeeperOptions = {
        enableAuditLog: true,
      }
      const hook = createBeforeOperationHook(options)
      
      const user = createMockUser({
        id: '2',
        email: 'admin@example.com',
        role: createMockRole({ permissions: ['*'] }),
      })
      mockReq.user = user

      const args = {
        req: mockReq,
        collection: 'posts',
        operation: 'delete',
      }

      await hook({ args, operation: 'delete' })
      
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        '✅ Permission granted: User admin@example.com performed posts.delete'
      )
    })

    it('should log denied access when audit is enabled', async () => {
      const options: GatekeeperOptions = {
        enableAuditLog: true,
      }
      const hook = createBeforeOperationHook(options)
      
      const user = createMockUser({
        id: '2',
        email: 'hacker@example.com',
        role: createMockRole({ permissions: [] }),
      })
      mockReq.user = user

      const args = {
        req: mockReq,
        collection: 'sensitive-data',
        operation: 'delete',
      }

      await expect(hook({ args, operation: 'delete' })).rejects.toThrow()
      
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '🚫 Permission denied: User hacker@example.com tried sensitive-data.delete'
      )
    })

    it('should not log when audit is disabled', async () => {
      const hook = createBeforeOperationHook() // No audit option
      
      const user = createMockUser({
        id: '2',
        email: 'user@example.com',
        role: createMockRole({ permissions: ['posts.read'] }),
      })
      mockReq.user = user

      const args = {
        req: mockReq,
        collection: 'posts',
        operation: 'read',
      }

      await hook({ args, operation: 'read' })
      
      expect(consoleInfoSpy).not.toHaveBeenCalled()
      expect(consoleWarnSpy).not.toHaveBeenCalled()
    })
  })

  describe('edge cases with role as ID', () => {
    it('should handle role as string ID and fetch from database', async () => {
      const hook = createBeforeOperationHook()
      
      const roleDoc = createMockRole({
        id: 'role-id-123',
        permissions: ['posts.read'],
        active: true,
      })
      
      // Mock the payload.findByID to return the role
      mockReq.payload.findByID.mockResolvedValue(roleDoc)
      
      const user = {
        id: '2',
        email: 'user@example.com',
        role: 'role-id-123', // String ID instead of object
      }

      const args = {
        req: { ...mockReq, user },
        collection: 'posts',
        operation: 'read',
      }

      const result = await hook({ args, operation: 'read' })
      expect(result).toBe(args)
      
      // Verify it fetched the role
      expect(mockReq.payload.findByID).toHaveBeenCalledWith({
        collection: 'roles',
        id: 'role-id-123',
        depth: 0,
      })
    })

    it('should deny access when role ID points to non-existent role', async () => {
      const hook = createBeforeOperationHook()
      
      // Mock the payload.findByID to return null (role not found)
      mockReq.payload.findByID.mockResolvedValue(null)
      
      const user = {
        id: '2',
        email: 'user@example.com',
        role: 'non-existent-role',
      }

      const args = {
        req: { ...mockReq, user },
        collection: 'posts',
        operation: 'read',
      }

      await expect(hook({ args, operation: 'read' })).rejects.toThrow()
    })

    it('should deny access when role ID points to inactive role', async () => {
      const hook = createBeforeOperationHook()
      
      const roleDoc = createMockRole({
        id: 'role-id-123',
        permissions: ['posts.read'],
        active: false, // Inactive
      })
      
      mockReq.payload.findByID.mockResolvedValue(roleDoc)
      
      const user = {
        id: '2',
        email: 'user@example.com',
        role: 'role-id-123',
      }

      const args = {
        req: { ...mockReq, user },
        collection: 'posts',
        operation: 'read',
      }

      await expect(hook({ args, operation: 'read' })).rejects.toThrow()
    })
  })

  describe('first user special case', () => {
    it('should allow first user (ID 1) to do anything', async () => {
      const hook = createBeforeOperationHook()
      
      // First user with no permissions
      const user = createMockUser({
        id: '1', // First user
        email: 'first@example.com',
        role: createMockRole({ permissions: [] }),
      })
      mockReq.user = user

      // Should allow everything for first user
      const operations = ['create', 'read', 'update', 'delete']
      for (const operation of operations) {
        const args = {
          req: mockReq,
          collection: 'sensitive-data',
          operation,
        }
        
        const result = await hook({ args, operation })
        expect(result).toBe(args)
      }
    })

    it('should allow first user even with inactive role', async () => {
      const hook = createBeforeOperationHook()
      
      const user = createMockUser({
        id: '1', // First user
        email: 'first@example.com',
        role: createMockRole({ 
          permissions: [],
          active: false, // Even inactive
        }),
      })
      mockReq.user = user

      const args = {
        req: mockReq,
        collection: 'posts',
        operation: 'delete',
      }
      
      const result = await hook({ args, operation: 'delete' })
      expect(result).toBe(args)
    })
  })

  describe('different operations', () => {
    it('should handle all CRUD operations correctly', async () => {
      const hook = createBeforeOperationHook()
      
      const role = createMockRole({
        permissions: ['posts.create', 'posts.read', 'posts.update', 'posts.delete'],
        active: true,
      })
      
      const user = createMockUser({
        id: '2',
        role,
      })
      mockReq.user = user

      const operations = ['create', 'read', 'update', 'delete']
      
      for (const operation of operations) {
        const args = {
          req: mockReq,
          collection: 'posts',
          operation,
        }

        const result = await hook({ args, operation })
        expect(result).toBe(args)
      }
    })

    it('should build correct permission string for different collections', async () => {
      const hook = createBeforeOperationHook()
      
      const role = createMockRole({
        permissions: ['backend-users.read', 'media.read', 'posts.read'],
        active: true,
      })
      
      const user = createMockUser({
        id: '2',
        role,
      })
      mockReq.user = user

      const collections = ['backend-users', 'media', 'posts']
      
      for (const collection of collections) {
        const args = {
          req: mockReq,
          collection,
          operation: 'read',
        }

        const result = await hook({ args, operation: 'read' })
        expect(result).toBe(args)
      }
      
      // Should deny on collections without permission
      const args = {
        req: mockReq,
        collection: 'other-collection',
        operation: 'read',
      }
      
      await expect(hook({ args, operation: 'read' })).rejects.toThrow()
    })
  })
})