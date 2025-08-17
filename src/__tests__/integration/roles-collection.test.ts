import { createRolesCollection } from '../../collections/Roles'
import { mockCollections, mockPluginOptions } from '../helpers/fixtures'
import { createMockRequest, createMockUser } from '../helpers/mockPayload'

describe('Roles Collection Integration', () => {
  let rolesCollection: any
  let mockReq: any

  beforeEach(() => {
    rolesCollection = createRolesCollection(mockCollections, mockPluginOptions)
    mockReq = createMockRequest()
  })

  describe('collection configuration', () => {
    it('should create roles collection with correct slug', () => {
      expect(rolesCollection.slug).toBe('roles')
    })

    it('should use custom slug when provided', () => {
      const customOptions = {
        ...mockPluginOptions,
        rolesSlug: 'custom-roles',
      }
      const customRolesCollection = createRolesCollection(mockCollections, customOptions)
      expect(customRolesCollection.slug).toBe('custom-roles')
    })

    it('should set admin configuration', () => {
      expect(rolesCollection.admin.useAsTitle).toBe('label')
      expect(rolesCollection.admin.defaultColumns).toContain('label')
      expect(rolesCollection.admin.defaultColumns).toContain('permissions')
      expect(rolesCollection.admin.group).toBe('System')
    })

    it('should use custom group when provided', () => {
      const customOptions = {
        ...mockPluginOptions,
        rolesGroup: 'Custom Group',
      }
      const customRolesCollection = createRolesCollection(mockCollections, customOptions)
      expect(customRolesCollection.admin?.group).toBe('Custom Group')
    })
  })

  describe('fields configuration', () => {
    it('should have all required fields', () => {
      const fieldNames = rolesCollection.fields.map((f: any) => f.name)

      expect(fieldNames).toContain('name')
      expect(fieldNames).toContain('label')
      expect(fieldNames).toContain('permissions')
      expect(fieldNames).toContain('description')
      expect(fieldNames).toContain('active')
      expect(fieldNames).toContain('protected')
      expect(fieldNames).toContain('configHash')
      expect(fieldNames).toContain('configVersion')
      expect(fieldNames).toContain('systemManaged')
      expect(fieldNames).toContain('visibleFor')
    })

    it('should generate permissions for all collections including roles', () => {
      const permissionsField = rolesCollection.fields.find(
        (f: any) => f.name === 'permissions'
      )

      const permissionValues = permissionsField.options.map((o: any) => o.value)

      // Should include permissions for all collections
      expect(permissionValues).toContain('backend-users.read')
      expect(permissionValues).toContain('users.read')
      expect(permissionValues).toContain('posts.read')
      expect(permissionValues).toContain('media.read')

      // Should include roles permissions (since we fixed this)
      expect(permissionValues).toContain('roles.read')
      expect(permissionValues).toContain('roles.create')
      expect(permissionValues).toContain('roles.update')
      expect(permissionValues).toContain('roles.delete')

      // Should include special permissions
      expect(permissionValues).toContain('*')
      expect(permissionValues).toContain('*.read')
    })

    it('should configure visibleFor field with auth collections', () => {
      const visibleForField = rolesCollection.fields.find(
        (f: any) => f.name === 'visibleFor'
      )

      expect(visibleForField.type).toBe('select')
      expect(visibleForField.hasMany).toBe(true)
      expect(visibleForField.required).toBe(false)

      const options = visibleForField.options.map((o: any) => o.value)
      expect(options).toContain('backend-users')
      expect(options).toContain('users')
      expect(options).not.toContain('posts') // Not an auth collection
    })
  })

  describe('access control', () => {
    it('should allow read access for authenticated users', async () => {
      mockReq.user = createMockUser()
      const canRead = await rolesCollection.access.read({ req: mockReq })
      expect(canRead).toBe(true)
    })

    it('should allow read access during first user setup', async () => {
      mockReq.user = null
      mockReq.payload.count.mockResolvedValue({ totalDocs: 0 })

      const canRead = await rolesCollection.access.read({ req: mockReq })
      expect(canRead).toBe(true)
    })

    it('should deny read access for unauthenticated when users exist', async () => {
      mockReq.user = null
      mockReq.payload.count.mockResolvedValue({ totalDocs: 1 })

      const canRead = await rolesCollection.access.read({ req: mockReq })
      expect(canRead).toBe(false)
    })

    it('should check create permission', async () => {
      const userWithPermission = createMockUser({
        role: {
          permissions: ['roles.create'],
          active: true,
        },
      })
      mockReq.user = userWithPermission
      mockReq.payload.findByID.mockResolvedValue(userWithPermission.role)

      const canCreate = await rolesCollection.access.create({ req: mockReq })
      expect(canCreate).toBe(true)
    })

    it('should check update permission', async () => {
      const userWithPermission = createMockUser({
        role: {
          permissions: ['roles.update'],
          active: true,
        },
      })
      mockReq.user = userWithPermission
      mockReq.payload.findByID.mockResolvedValue(userWithPermission.role)

      const canUpdate = await rolesCollection.access.update({ req: mockReq })
      expect(canUpdate).toBe(true)
    })

    it('should check delete permission', async () => {
      const userWithPermission = createMockUser({
        role: {
          permissions: ['roles.delete'],
          active: true,
        },
      })
      mockReq.user = userWithPermission
      mockReq.payload.findByID.mockResolvedValue(userWithPermission.role)

      const canDelete = await rolesCollection.access.delete({ req: mockReq })
      expect(canDelete).toBe(true)
    })

    it('should deny access without proper permissions', async () => {
      const userWithoutPermission = createMockUser({
        role: {
          permissions: ['posts.read'],
          active: true,
        },
      })
      mockReq.user = userWithoutPermission
      mockReq.payload.findByID.mockResolvedValue(userWithoutPermission.role)

      const canCreate = await rolesCollection.access.create({ req: mockReq })
      const canUpdate = await rolesCollection.access.update({ req: mockReq })
      const canDelete = await rolesCollection.access.delete({ req: mockReq })

      expect(canCreate).toBe(false)
      expect(canUpdate).toBe(false)
      expect(canDelete).toBe(false)
    })
  })

  describe('hooks', () => {
    it('should protect super admin role from certain updates', async () => {
      const beforeChangeHook = rolesCollection.hooks.beforeChange[0]

      const originalDoc = {
        name: 'super_admin',
        protected: true,
      }

      const data = {
        name: 'changed_name', // Trying to change name
        description: 'New description',
      }

      await expect(
        beforeChangeHook({
          data,
          req: mockReq,
          operation: 'update',
          originalDoc,
        })
      ).rejects.toThrow('Protected roles can only have their description and permissions updated')
    })

    it('should allow updating description and permissions of protected roles', async () => {
      const beforeChangeHook = rolesCollection.hooks.beforeChange[0]

      const originalDoc = {
        name: 'super_admin',
        protected: true,
      }

      const data = {
        description: 'New description',
        permissions: ['*'],
      }

      const result = await beforeChangeHook({
        data,
        req: mockReq,
        operation: 'update',
        originalDoc,
      })

      expect(result).toEqual(data)
    })

    it('should prevent deletion of protected roles', async () => {
      const beforeDeleteHook = rolesCollection.hooks.beforeDelete[0]

      const mockReq = {
        payload: {
          findByID: jest.fn().mockResolvedValue({
            name: 'super_admin',
            protected: true,
          }),
        },
      }

      await expect(
        beforeDeleteHook({ id: 'role-id', req: mockReq })
      ).rejects.toThrow('Protected roles cannot be deleted')
    })

    it('should allow deletion of non-protected roles', async () => {
      const beforeDeleteHook = rolesCollection.hooks.beforeDelete[0]

      const mockReq = {
        payload: {
          findByID: jest.fn().mockResolvedValue({
            name: 'custom_role',
            protected: false,
          }),
        },
      }

      // Should not throw
      await expect(
        beforeDeleteHook({ id: 'role-id', req: mockReq })
      ).resolves.not.toThrow()
    })

    it('should skip validation during seeding mode', async () => {
      const optionsWithSeeding = {
        ...mockPluginOptions,
        seedingMode: true,
      }

      const seedingRolesCollection = createRolesCollection(mockCollections, optionsWithSeeding)
      const beforeChangeHook = seedingRolesCollection.hooks?.beforeChange?.[0]

      const originalDoc = {
        name: 'super_admin',
        protected: true,
      }

      const data = {
        name: 'changed_name', // Would normally be blocked
      }

      // @ts-expect-error Satisfies type
      const result = await beforeChangeHook({
        data,
        req: mockReq,
        operation: 'update',
        originalDoc,
      })

      expect(result).toEqual(data) // Should pass through
    })
  })

  describe('timestamps', () => {
    it('should enable timestamps', () => {
      expect(rolesCollection.timestamps).toBe(true)
    })
  })
})
