import { createAfterChangeHook } from '../../hooks/afterChangeHook'
import { createMockRole } from '../helpers/mockPayload'

describe('createAfterChangeHook', () => {
  let consoleInfoSpy: any
  let consoleWarnSpy: any
  let consoleErrorSpy: any

  beforeEach(() => {
    jest.clearAllMocks()
    // Spy on console methods
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => {})
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('autoAssignFirstUser', () => {
    it('should assign super_admin role to first user', async () => {
      // In-memory role storage
      const roles = [
        createMockRole({ 
          id: 'super-admin-id', 
          name: 'super_admin',
          label: 'Super Admin',
          permissions: ['*'],
          active: true,
          protected: true
        })
      ]

      // Create a minimal mock payload that simulates real behavior
      const mockPayload = {
        find: async ({ where }: any) => {
          const nameEquals = where?.name?.equals
          const foundRoles = roles.filter(r => r.name === nameEquals)
          return { docs: foundRoles }
        },
        update: async ({ id, data }: any) => {
          // Simulate updating the user
          return { id, ...data }
        }
      }

      const hook = createAfterChangeHook('backend-users', {
        autoAssignFirstUser: true,
        enhance: true,
      })

      const doc = { id: 1, email: 'admin@example.com' } // First user has id: 1
      const req = { payload: mockPayload, context: {} }
      
      const result = await hook({
        doc,
        req,
        operation: 'create',
      } as any)

      // Check that the role was assigned
      expect(result.role).toBe('super-admin-id')
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('✅ First user automatically assigned Super Admin role')
      )
    })

    it('should not assign role if not first user', async () => {
      const hook = createAfterChangeHook('backend-users', {
        autoAssignFirstUser: true,
        enhance: true,
      })

      const doc = { id: 2, email: 'user@example.com' } // Not first user
      const req = { payload: {}, context: {} }
      
      const result = await hook({
        doc,
        req,
        operation: 'create',
      } as any)

      expect(result).toBe(doc) // Unchanged
      expect(result.role).toBeUndefined()
    })

    it('should not assign role on update operation', async () => {
      const hook = createAfterChangeHook('backend-users', {
        autoAssignFirstUser: true,
        enhance: true,
      })

      const doc = { id: 1, email: 'admin@example.com' }
      const req = { payload: {}, context: {} }
      
      const result = await hook({
        doc,
        req,
        operation: 'update', // Update, not create
      } as any)

      expect(result).toBe(doc)
      expect(result.role).toBeUndefined()
    })

    it('should skip if user already has role', async () => {
      const hook = createAfterChangeHook('backend-users', {
        autoAssignFirstUser: true,
        enhance: true,
      })

      const doc = { 
        id: 1, 
        email: 'admin@example.com',
        role: 'existing-role' // Already has role
      }
      const req = { payload: {}, context: {} }
      
      const result = await hook({
        doc,
        req,
        operation: 'create',
      } as any)

      expect(result).toBe(doc)
      expect(result.role).toBe('existing-role') // Unchanged
    })

    it('should handle super_admin role not found', async () => {
      const mockPayload = {
        find: async () => ({ docs: [] }), // No roles found
        update: jest.fn()
      }

      const hook = createAfterChangeHook('backend-users', {
        autoAssignFirstUser: true,
        enhance: true,
      })

      const doc = { id: 1, email: 'admin@example.com' }
      const req = { payload: mockPayload, context: {} }
      
      const result = await hook({
        doc,
        req,
        operation: 'create',
      } as any)

      expect(result).toBe(doc)
      expect(result.role).toBeUndefined()
      expect(mockPayload.update).not.toHaveBeenCalled()
    })
  })

  describe('defaultRole', () => {
    it('should assign default role to new user', async () => {
      const roles = [
        createMockRole({ 
          id: 'user-role-id', 
          name: 'user',
          label: 'User',
          permissions: ['posts.read'],
          active: true
        })
      ]

      const mockPayload = {
        find: async ({ where }: any) => {
          const nameEquals = where?.name?.equals
          const foundRoles = roles.filter(r => r.name === nameEquals)
          return { docs: foundRoles }
        },
        update: async ({ id, data }: any) => {
          return { id, ...data }
        }
      }

      const hook = createAfterChangeHook('users', {
        defaultRole: 'user',
        enhance: true,
      })

      const doc = { id: 'user-1', email: 'newuser@example.com' }
      const req = { payload: mockPayload, context: {} }
      
      const result = await hook({
        doc,
        req,
        operation: 'create',
      } as any)

      expect(result.role).toBe('user-role-id')
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining("✅ User assigned default role 'user'")
      )
    })

    it('should not assign default role if user already has role', async () => {
      const hook = createAfterChangeHook('users', {
        defaultRole: 'user',
        enhance: true,
      })

      const doc = { 
        id: 'user-1', 
        email: 'user@example.com',
        role: 'existing-role' 
      }
      const req = { payload: {}, context: {} }
      
      const result = await hook({
        doc,
        req,
        operation: 'create',
      } as any)

      expect(result).toBe(doc)
      expect(result.role).toBe('existing-role')
    })

    it('should handle default role not found', async () => {
      const mockPayload = {
        find: async () => ({ docs: [] }), // Role not found
        update: jest.fn()
      }

      const hook = createAfterChangeHook('users', {
        defaultRole: 'nonexistent',
        enhance: true,
      })

      const doc = { id: 'user-1', email: 'user@example.com' }
      const req = { payload: mockPayload, context: {} }
      
      const result = await hook({
        doc,
        req,
        operation: 'create',
      } as any)

      expect(result).toBe(doc)
      expect(result.role).toBeUndefined()
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "⚠️ Default role 'nonexistent' not found"
      )
      expect(mockPayload.update).not.toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    it('should handle find operation failure', async () => {
      const mockPayload = {
        find: async () => {
          throw new Error('Database error')
        },
        update: jest.fn()
      }

      const hook = createAfterChangeHook('backend-users', {
        autoAssignFirstUser: true,
        enhance: true,
      })

      const doc = { id: 1, email: 'admin@example.com' }
      const req = { payload: mockPayload, context: {} }
      
      const result = await hook({
        doc,
        req,
        operation: 'create',
      } as any)

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error assigning super admin role after creation:',
        expect.any(Error)
      )
      expect(result).toBe(doc)
      expect(mockPayload.update).not.toHaveBeenCalled()
    })

    it('should handle update operation failure', async () => {
      const roles = [
        createMockRole({ 
          id: 'user-role-id', 
          name: 'user',
          permissions: ['posts.read']
        })
      ]

      const mockPayload = {
        find: async ({ where }: any) => {
          const nameEquals = where?.name?.equals
          const foundRoles = roles.filter(r => r.name === nameEquals)
          return { docs: foundRoles }
        },
        update: async () => {
          throw new Error('Update failed')
        }
      }

      const hook = createAfterChangeHook('users', {
        defaultRole: 'user',
        enhance: true,
      })

      const doc = { id: 'user-1', email: 'user@example.com' }
      const req = { payload: mockPayload, context: {} }
      
      const result = await hook({
        doc,
        req,
        operation: 'create',
      } as any)

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[afterChangeHook] Failed to update user with default role:',
        expect.any(Error)
      )
      expect(result).toBe(doc)
      expect(result.role).toBeUndefined() // Role was not assigned due to error
    })
  })

  describe('context flags', () => {
    it('should set isSystemUpdate context during role assignment', async () => {
      const roles = [
        createMockRole({ 
          id: 'user-role-id', 
          name: 'user',
          permissions: ['posts.read']
        })
      ]

      let capturedUpdateArgs: any = null

      const mockPayload = {
        find: async ({ where }: any) => {
          const nameEquals = where?.name?.equals
          const foundRoles = roles.filter(r => r.name === nameEquals)
          return { docs: foundRoles }
        },
        update: async (args: any) => {
          capturedUpdateArgs = args
          return { id: args.id, ...args.data }
        }
      }

      const hook = createAfterChangeHook('users', {
        defaultRole: 'user',
        enhance: true,
      })

      const doc = { id: 'user-1', email: 'user@example.com' }
      const req = { payload: mockPayload, context: {} }
      
      await hook({
        doc,
        req,
        operation: 'create',
      } as any)

      expect(capturedUpdateArgs).toBeDefined()
      expect(capturedUpdateArgs.context.isSystemUpdate).toBe(true)
      expect(capturedUpdateArgs.context.skipValidation).toBe(true)
      expect(capturedUpdateArgs.overrideAccess).toBe(true)
    })
  })

  describe('combined behaviors', () => {
    it('should prioritize autoAssignFirstUser over defaultRole', async () => {
      const roles = [
        createMockRole({ 
          id: 'super-admin-id', 
          name: 'super_admin',
          permissions: ['*'],
          protected: true
        }),
        createMockRole({ 
          id: 'user-role-id', 
          name: 'user',
          permissions: ['posts.read']
        })
      ]

      const mockPayload = {
        find: async ({ where }: any) => {
          const nameEquals = where?.name?.equals
          const foundRoles = roles.filter(r => r.name === nameEquals)
          return { docs: foundRoles }
        },
        update: async ({ id, data }: any) => {
          return { id, ...data }
        }
      }

      const hook = createAfterChangeHook('backend-users', {
        autoAssignFirstUser: true,
        defaultRole: 'user', // Both options set
        enhance: true,
      })

      const doc = { id: 1, email: 'admin@example.com' } // First user
      const req = { payload: mockPayload, context: {} }
      
      const result = await hook({
        doc,
        req,
        operation: 'create',
      } as any)

      // Should get super_admin, not user role
      expect(result.role).toBe('super-admin-id')
    })

    it('should assign default role to non-first users when both options are set', async () => {
      const roles = [
        createMockRole({ 
          id: 'user-role-id', 
          name: 'user',
          permissions: ['posts.read']
        })
      ]

      const mockPayload = {
        find: async ({ where }: any) => {
          const nameEquals = where?.name?.equals
          const foundRoles = roles.filter(r => r.name === nameEquals)
          return { docs: foundRoles }
        },
        update: async ({ id, data }: any) => {
          return { id, ...data }
        }
      }

      const hook = createAfterChangeHook('backend-users', {
        autoAssignFirstUser: true,
        defaultRole: 'user',
        enhance: true,
      })

      const doc = { id: 2, email: 'user@example.com' } // Not first user
      const req = { payload: mockPayload, context: {} }
      
      const result = await hook({
        doc,
        req,
        operation: 'create',
      } as any)

      // Should get default user role since not first user
      expect(result.role).toBe('user-role-id')
    })
  })

  describe('non-enhanced collections', () => {
    it('should return doc unchanged when enhance is false', async () => {
      const hook = createAfterChangeHook('posts', {
        enhance: false, // Not an auth collection
        autoAssignFirstUser: true,
        defaultRole: 'user',
      })

      const doc = { id: 1, title: 'Test Post' }
      const req = { payload: {}, context: {} }
      
      const result = await hook({
        doc,
        req,
        operation: 'create',
      } as any)

      expect(result).toBe(doc)
      expect(result).toEqual(doc) // Completely unchanged
    })
  })
})