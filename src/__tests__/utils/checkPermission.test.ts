import { checkPermission, hasPermission, canAssignRole, isPermissionCovered } from '../../utils/checkPermission'
import { createMockRole } from '../helpers/mockPayload'
import { mockRoles } from '../helpers/fixtures'

describe('checkPermission', () => {
  // In-memory role store for more realistic testing
  let roleStore: Map<string, any>
  let mockPayload: any

  beforeEach(() => {
    // Initialize role store with some test data
    roleStore = new Map([
      ['role-1', createMockRole({ 
        id: 'role-1',
        permissions: ['posts.read', 'posts.create'],
        active: true 
      })],
      ['role-2', createMockRole({ 
        id: 'role-2',
        permissions: ['posts.*'],
        active: true 
      })],
      ['role-3', createMockRole({ 
        id: 'role-3',
        permissions: ['posts.read'],
        active: false // Inactive
      })],
    ])

    // Create a minimal mock payload that simulates database behavior
    mockPayload = {
      findByID: async ({ id }: any) => {
        return roleStore.get(id) || null
      }
    }

    // Suppress console.error during tests
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('hasPermission', () => {
    it('should return true for super admin with * permission', () => {
      const result = hasPermission(['*'], 'posts.read')
      expect(result).toBe(true)
    })

    it('should return true for exact permission match', () => {
      const result = hasPermission(['posts.read', 'posts.write'], 'posts.read')
      expect(result).toBe(true)
    })

    it('should return true for wildcard collection permission', () => {
      const result = hasPermission(['posts.*'], 'posts.read')
      expect(result).toBe(true)
    })

    it('should return true for wildcard operation permission', () => {
      const result = hasPermission(['*.read'], 'posts.read')
      expect(result).toBe(true)
    })

    it('should handle complex wildcard patterns', () => {
      // Test *.*.read pattern
      const result1 = hasPermission(['users.*.read'], 'users.profile.read')
      expect(result1).toBe(true)
      
      // Test multiple wildcards
      const result2 = hasPermission(['admin.*.*'], 'admin.users.delete')
      expect(result2).toBe(true)
    })

    it('should return false when permission is not granted', () => {
      const result = hasPermission(['posts.read'], 'posts.write')
      expect(result).toBe(false)
    })

    it('should return false for empty permissions array', () => {
      const result = hasPermission([], 'posts.read')
      expect(result).toBe(false)
    })

    it('should handle undefined permissions', () => {
      const result = hasPermission(undefined as any, 'posts.read')
      expect(result).toBe(false)
    })

    it('should handle null permissions', () => {
      const result = hasPermission(null as any, 'posts.read')
      expect(result).toBe(false)
    })
  })

  describe('isPermissionCovered', () => {
    it('should check if permission is covered by wildcard', () => {
      const userPermissions = ['posts.*', 'users.read']
      
      expect(isPermissionCovered('posts.read', userPermissions)).toBe(true)
      expect(isPermissionCovered('posts.write', userPermissions)).toBe(true)
      expect(isPermissionCovered('users.read', userPermissions)).toBe(true)
      expect(isPermissionCovered('users.write', userPermissions)).toBe(false)
    })

    it('should handle * wildcard', () => {
      const userPermissions = ['*']
      
      expect(isPermissionCovered('anything.anywhere', userPermissions)).toBe(true)
    })

    it('should handle operation wildcards', () => {
      const userPermissions = ['*.read']
      
      expect(isPermissionCovered('posts.read', userPermissions)).toBe(true)
      expect(isPermissionCovered('users.read', userPermissions)).toBe(true)
      expect(isPermissionCovered('posts.write', userPermissions)).toBe(false)
    })
  })

  describe('checkPermission', () => {
    it('should check permission for role object', async () => {
      const role = createMockRole({ 
        permissions: ['posts.read'],
        active: true
      })
      
      const result = await checkPermission(mockPayload, role as any, 'posts.read')
      expect(result).toBe(true)
    })

    it('should check permission with wildcards in role', async () => {
      const role = createMockRole({ 
        permissions: ['posts.*'],
        active: true
      })
      
      expect(await checkPermission(mockPayload, role as any, 'posts.read')).toBe(true)
      expect(await checkPermission(mockPayload, role as any, 'posts.write')).toBe(true)
      expect(await checkPermission(mockPayload, role as any, 'users.read')).toBe(false)
    })

    it('should fetch role from database when given ID', async () => {
      // Role exists in our store
      const result = await checkPermission(mockPayload, 'role-1', 'posts.read')
      expect(result).toBe(true)
      
      // Check that it correctly checks permissions
      const result2 = await checkPermission(mockPayload, 'role-1', 'posts.delete')
      expect(result2).toBe(false) // role-1 doesn't have delete permission
    })

    it('should return false for non-existent role ID', async () => {
      const result = await checkPermission(mockPayload, 'non-existent-role', 'posts.read')
      expect(result).toBe(false)
    })

    it('should return false for inactive role', async () => {
      const role = createMockRole({ 
        permissions: ['posts.read'],
        active: false 
      })
      
      const result = await checkPermission(mockPayload, role as any, 'posts.read')
      expect(result).toBe(false)
    })

    it('should return false for inactive role fetched by ID', async () => {
      // role-3 is inactive in our store
      const result = await checkPermission(mockPayload, 'role-3', 'posts.read')
      expect(result).toBe(false)
    })

    it('should handle null role with userId', async () => {
      // User with null role = no permissions
      const result = await checkPermission(mockPayload, null, 'posts.read', 'user-123')
      expect(result).toBe(false)
    })

    it('should handle undefined role with userId', async () => {
      // User with undefined role = no permissions  
      const result = await checkPermission(mockPayload, undefined as any, 'posts.read', 'user-123')
      expect(result).toBe(false)
    })

    it('should handle errors gracefully', async () => {
      const errorPayload = {
        findByID: async () => {
          throw new Error('Database connection failed')
        }
      }
      
      const result = await checkPermission(errorPayload as any, 'role-1', 'posts.read')
      expect(result).toBe(false)
    })

    it('should allow first user (ID 1) to do anything', async () => {
      // First user with no role
      const result1 = await checkPermission(mockPayload, null, 'posts.delete', 1)
      expect(result1).toBe(true)
      
      // First user with string ID
      const result2 = await checkPermission(mockPayload, null, 'admin.dangerous', '1')
      expect(result2).toBe(true)
      
      // First user with empty permissions
      const role = createMockRole({ permissions: [], active: true })
      const result3 = await checkPermission(mockPayload, role as any, 'posts.delete', 1)
      expect(result3).toBe(true)
    })

    it('should not give special treatment to non-first users', async () => {
      // User ID 2 with no role (has userId so not public)
      const result1 = await checkPermission(mockPayload, null, 'posts.read', 2)
      expect(result1).toBe(false)
      
      // User ID 2 with empty permissions
      const role = createMockRole({ permissions: [], active: true })
      const result2 = await checkPermission(mockPayload, role as any, 'posts.read', 2)
      expect(result2).toBe(false)
    })
  })

  describe('canAssignRole', () => {
    it('should allow super admin to assign any role', () => {
      const userPermissions = ['*']
      const targetRole = mockRoles[2] // editor role
      
      const result = canAssignRole(userPermissions, targetRole)
      expect(result).toBe(true)
    })

    it('should not allow assigning protected roles without * permission', () => {
      const userPermissions = ['roles.*', 'users.*'] // Even with all roles permissions
      const targetRole = mockRoles[0] // super_admin (protected)
      
      const result = canAssignRole(userPermissions, targetRole)
      expect(result).toBe(false)
    })

    it('should allow assigning role if user has all target permissions', () => {
      const userPermissions = ['posts.*', 'media.*']
      const targetRole = createMockRole({
        permissions: ['posts.read', 'media.read']
      })
      
      const result = canAssignRole(userPermissions, targetRole)
      expect(result).toBe(true)
    })

    it('should handle wildcard permissions correctly', () => {
      const userPermissions = ['posts.*']
      
      // Should allow assigning role with subset of posts permissions
      const targetRole1 = createMockRole({
        permissions: ['posts.read', 'posts.write']
      })
      expect(canAssignRole(userPermissions, targetRole1)).toBe(true)
      
      // Should not allow if target has permissions outside posts
      const targetRole2 = createMockRole({
        permissions: ['posts.read', 'users.read']
      })
      expect(canAssignRole(userPermissions, targetRole2)).toBe(false)
    })

    it('should not allow assigning role if user lacks some permissions', () => {
      const userPermissions = ['posts.read']
      const targetRole = createMockRole({
        permissions: ['posts.read', 'posts.write']
      })
      
      const result = canAssignRole(userPermissions, targetRole)
      expect(result).toBe(false)
    })

    it('should allow super admin to assign any role regardless of active status', () => {
      const userPermissions = ['*']
      const targetRole = createMockRole({
        permissions: ['posts.read'],
        active: false
      })
      
      const result = canAssignRole(userPermissions, targetRole)
      expect(result).toBe(true) // Super admin can assign any role
    })

    it('should handle role without permissions array', () => {
      const userPermissions = ['*']
      const targetRole = { ...mockRoles[0], permissions: undefined } as any
      
      const result = canAssignRole(userPermissions, targetRole)
      expect(result).toBe(true) // Super admin can still assign
    })

    it('should handle empty target permissions', () => {
      const userPermissions = ['posts.*']
      const targetRole = createMockRole({
        permissions: []
      })
      
      const result = canAssignRole(userPermissions, targetRole)
      expect(result).toBe(true) // Empty permissions can be assigned
    })

    it('should handle null target permissions', () => {
      const userPermissions = ['posts.*']
      const targetRole = createMockRole({
        permissions: null as any
      })
      
      const result = canAssignRole(userPermissions, targetRole)
      expect(result).toBe(true) // Null permissions treated as empty
    })
  })

  describe('New type handling and caching', () => {
    it('should handle number role IDs', async () => {
      // Add numeric ID to store
      roleStore.set('123', createMockRole({ 
        id: '123',
        permissions: ['posts.read'],
        active: true 
      }))

      const result = await checkPermission(mockPayload, 123, 'posts.read')
      expect(result).toBe(true)
    })

    it('should handle undefined role with userId (no public access)', async () => {
      const result = await checkPermission(mockPayload, undefined, 'posts.read', 'user-123')
      expect(result).toBe(false)
    })

    it('should allow public read when no user and no role', async () => {
      // No userId and no role = public user with default *.read
      const result = await checkPermission(mockPayload, undefined, 'posts.read')
      expect(result).toBe(true)
    })

    it('should deny public write operations', async () => {
      // Public user trying to write
      const result = await checkPermission(mockPayload, undefined, 'posts.create')
      expect(result).toBe(false)
    })

    it('should load role when not populated', async () => {
      const findByIDSpy = jest.spyOn(mockPayload, 'findByID')

      // Call with role ID should fetch from DB
      await checkPermission(mockPayload, 'role-1', 'posts.read')
      expect(findByIDSpy).toHaveBeenCalledTimes(1)
      expect(findByIDSpy).toHaveBeenCalledWith({
        collection: 'roles',
        id: 'role-1',
        depth: 0
      })
    })

    it('should not load role when already populated', async () => {
      const findByIDSpy = jest.spyOn(mockPayload, 'findByID')
      const populatedRole = roleStore.get('role-1')

      // Call with populated role object should NOT fetch from DB
      await checkPermission(mockPayload, populatedRole, 'posts.read')
      expect(findByIDSpy).not.toHaveBeenCalled()
    })

    it('should handle role lookup errors gracefully', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()
      const mockPayloadWithError = {
        findByID: jest.fn().mockRejectedValue(new Error('DB Error'))
      } as any

      const result = await checkPermission(mockPayloadWithError, 'invalid-id', 'posts.read')
      
      expect(result).toBe(false)
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Could not load role invalid-id:',
        expect.any(Error)
      )

      consoleWarnSpy.mockRestore()
    })
  })
})