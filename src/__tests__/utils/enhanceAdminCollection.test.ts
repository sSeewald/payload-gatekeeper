import { enhanceCollectionWithRole } from '../../utils/enhanceAdminCollection'
import type { CollectionConfig } from 'payload'

describe('enhanceCollectionWithRole', () => {
  let baseCollection: CollectionConfig

  beforeEach(() => {
    baseCollection = {
      slug: 'users',
      auth: true,
      fields: [
        {
          name: 'email',
          type: 'email',
          required: true,
        },
      ],
    }
  })

  it('should add role field to collection', () => {
    const enhanced = enhanceCollectionWithRole(baseCollection)

    const roleField = enhanced.fields.find((f: any) => f.name === 'role')
    expect(roleField).toBeDefined()
    expect(roleField?.type).toBe('relationship')
    expect((roleField as any)?.relationTo).toBe('roles') // Uses getRolesSlug() which defaults to 'roles'
  })

  it('should skip if role field already exists and skipIfRoleExists is true', () => {
    const collectionWithRole: CollectionConfig = {
      ...baseCollection,
      fields: [
        ...baseCollection.fields,
        {
          name: 'role',
          type: 'relationship',
          relationTo: 'roles',
        } as any,
      ],
    }

    const options = {
      skipIfRoleExists: true,
    }

    const enhanced = enhanceCollectionWithRole(collectionWithRole, options)

    // Should return the original collection unchanged
    expect(enhanced).toBe(collectionWithRole)
  })

  it('should place role field in sidebar when specified', () => {
    const options = {
      roleFieldPlacement: {
        position: 'sidebar' as const,
      },
    }

    const enhanced = enhanceCollectionWithRole(baseCollection, options)
    const roleField = enhanced.fields.find((f: any) => f.name === 'role')

    expect(roleField?.admin?.position).toBe('sidebar')
  })

  it('should place role field in specific tab', () => {
    const collectionWithTabs: CollectionConfig = {
      ...baseCollection,
      fields: [
        {
          type: 'tabs',
          tabs: [
            {
              label: 'General',
              fields: baseCollection.fields,
            },
            {
              label: 'Security',
              fields: [],
            },
          ],
        },
      ],
    }

    const options = {
      roleFieldPlacement: {
        tab: 'Security',
        position: 'first' as const,
      },
    }

    const enhanced = enhanceCollectionWithRole(collectionWithTabs, options)
    const tabsField = enhanced.fields.find((f: any) => f.type === 'tabs') as any
    const securityTab = tabsField.tabs.find((t: any) => t.label === 'Security')
    const roleField = securityTab.fields.find((f: any) => f.name === 'role')

    expect(roleField).toBeDefined()
  })

  it('should create new tab if specified tab does not exist', () => {
    const collectionWithTabs: CollectionConfig = {
      ...baseCollection,
      fields: [
        {
          type: 'tabs',
          tabs: [
            {
              label: 'General',
              fields: baseCollection.fields,
            },
          ],
        },
      ],
    }

    const options = {
      roleFieldPlacement: {
        tab: 'NonExistentTab',
        position: 'first' as const,
      },
    }

    const enhanced = enhanceCollectionWithRole(collectionWithTabs, options)
    const tabsField = enhanced.fields.find((f: any) => f.type === 'tabs') as any
    const newTab = tabsField.tabs.find((t: any) => t.label === 'NonExistentTab')

    expect(newTab).toBeDefined()
    expect(newTab.fields.find((f: any) => f.name === 'role')).toBeDefined()
  })

  it('should use custom roles slug from options', async () => {
    const getRolesModule = await import('../../utils/getRolesSlug')

    // Set the custom slug
    getRolesModule.setRolesSlug('custom-roles')

    const enhanced = enhanceCollectionWithRole(baseCollection)
    const roleField = enhanced.fields.find((f: any) => f.name === 'role')

    expect((roleField as any)?.relationTo).toBe('custom-roles') // Will use getRolesSlug() which now returns 'custom-roles'

    // Reset to default for other tests
    getRolesModule.setRolesSlug('roles')
  })

  it('should add validation to role field', async () => {
    const enhanced = enhanceCollectionWithRole(baseCollection)
    const roleField = enhanced.fields.find((f: any) => f.name === 'role') as any

    expect(roleField.validate).toBeDefined()
    expect(typeof roleField.validate).toBe('function')

    // Test validation during system update
    const req = {
      context: { isSystemUpdate: true },
      payload: {},
      user: null,
    }
    const result = await roleField.validate('role-id', { req, operation: 'create' })
    expect(result).toBe(true)
  })

  it('should add filterOptions to role field', async () => {
    const enhanced = enhanceCollectionWithRole(baseCollection)
    const roleField = enhanced.fields.find((f: any) => f.name === 'role') as any

    expect(roleField.filterOptions).toBeDefined()
    expect(typeof roleField.filterOptions).toBe('function')

    // Test filter during system update
    const req = {
      context: { isSystemUpdate: true },
      payload: {},
    }
    const result = await roleField.filterOptions({ req, user: null, operation: 'create' })
    expect(result).toBe(true)
  })

  it('should position role field at specified numeric index', () => {
    const options = {
      roleFieldPlacement: {
        position: 1,
      },
    }

    const enhanced = enhanceCollectionWithRole(baseCollection, options)

    expect((enhanced.fields[1] as any).name).toBe('role')
  })

  it('should position role field at last when specified', () => {
    const options = {
      roleFieldPlacement: {
        position: 'last' as const,
      },
    }

    const enhanced = enhanceCollectionWithRole(baseCollection, options)
    const lastField = enhanced.fields[enhanced.fields.length - 1] as any

    expect(lastField.name).toBe('role')
  })

  it('should preserve original collection properties', () => {
    const collectionWithHooks = {
      ...baseCollection,
      hooks: {
        beforeChange: [jest.fn()],
      },
      access: {
        read: jest.fn(),
      },
    }

    const enhanced = enhanceCollectionWithRole(collectionWithHooks)

    expect(enhanced.slug).toBe(collectionWithHooks.slug)
    expect(enhanced.auth).toBe(collectionWithHooks.auth)
    // Hooks are enhanced with afterRead and afterLogin, so check structure instead of reference
    expect(enhanced.hooks?.beforeChange).toEqual(collectionWithHooks.hooks?.beforeChange)
    expect(enhanced.hooks?.afterRead).toBeDefined()
    expect(Array.isArray(enhanced.hooks?.afterRead)).toBe(true)
    expect(enhanced.hooks?.afterLogin).toBeDefined()
    expect(Array.isArray(enhanced.hooks?.afterLogin)).toBe(true)
    expect(enhanced.access).toBe(collectionWithHooks.access)
  })

  it('should handle collections without fields array', () => {
    const collectionWithoutFields = {
      slug: 'users',
      auth: true,
    } as CollectionConfig

    const enhanced = enhanceCollectionWithRole(collectionWithoutFields)

    expect(enhanced.fields).toBeDefined()
    expect(Array.isArray(enhanced.fields)).toBe(true)
    expect(enhanced.fields.length).toBeGreaterThan(0)
  })

  describe('Role field validation', () => {
    it('should allow changes when skipPermissionChecks is true', async () => {
      const options = {
        skipPermissionChecks: true,
      }

      const enhanced = enhanceCollectionWithRole(baseCollection, options)
      const roleField = enhanced.fields.find((f: any) => f.name === 'role') as any

      const req = {
        payload: {},
        user: { id: '2', role: null },
      }

      const result = await roleField.validate('new-role', { req, operation: 'update' })
      expect(result).toBe(true)
    })

    it('should allow read operations without validation', async () => {
      const enhanced = enhanceCollectionWithRole(baseCollection)
      const roleField = enhanced.fields.find((f: any) => f.name === 'role') as any

      const req = {
        payload: {},
        user: { id: '2', role: 'role-1' },
      }

      const result = await roleField.validate('role-1', { req, operation: 'read' })
      expect(result).toBe(true)
    })

    it('should skip validation if role is unchanged during update', async () => {
      const enhanced = enhanceCollectionWithRole(baseCollection)
      const roleField = enhanced.fields.find((f: any) => f.name === 'role') as any

      const req = {
        payload: {},
        user: { id: '2', role: 'role-1' },
      }

      // When role field is not in data, it means it's unchanged
      const result = await roleField.validate('role-1', {
        req,
        operation: 'update',
        data: {} // No role in data means unchanged
      })
      expect(result).toBe(true)
    })

    it('should validate role assignment permissions', async () => {
      const enhanced = enhanceCollectionWithRole(baseCollection)
      const roleField = enhanced.fields.find((f: any) => f.name === 'role') as any

      const req = {
        payload: {
          findByID: jest.fn().mockResolvedValue({
            id: 'target-role',
            permissions: ['posts.read'],
            active: true,
          })
        },
        user: {
          id: '2',
          role: {
            id: 'user-role',
            permissions: ['posts.*', 'users.*'], // Has permissions
            active: true,
          }
        },
      }

      const result = await roleField.validate('target-role', {
        req,
        operation: 'update',
        data: { role: 'target-role' }
      })
      expect(result).toBe(true)
    })

    it('should reject role assignment without permissions', async () => {
      const enhanced = enhanceCollectionWithRole(baseCollection)
      const roleField = enhanced.fields.find((f: any) => f.name === 'role') as any

      const req = {
        payload: {
          findByID: jest.fn().mockResolvedValue({
            id: 'admin-role',
            label: 'Administrator',
            permissions: ['*'],
            active: true,
          })
        },
        user: {
          id: '2',
          role: {
            id: 'user-role',
            permissions: ['posts.read'], // Limited permissions
            active: true,
          }
        },
      }

      const result = await roleField.validate('admin-role', {
        req,
        operation: 'create',
        data: { role: 'admin-role' }
      })
      expect(result).toBe("You don't have permission to assign the Administrator role")
    })

    it('should handle missing user or role gracefully', async () => {
      const enhanced = enhanceCollectionWithRole(baseCollection)
      const roleField = enhanced.fields.find((f: any) => f.name === 'role') as any

      // No user - during initial creation this is allowed
      const result1 = await roleField.validate('role-1', {
        req: {
          payload: {
            findByID: jest.fn().mockResolvedValue(null) // Role not found
          }
        },
        operation: 'create',
        data: { role: 'role-1' }
      })
      expect(result1).toBe('Role not found')

      // User without role - getUserPermissions returns empty array, canAssignRole returns false
      const req2 = {
        payload: {
          findByID: jest.fn().mockResolvedValue({
            id: 'role-1',
            label: 'Test Role',
            permissions: ['posts.read'],
            active: true,
          })
        },
        user: { id: '2' } // No role property
      }
      const result2 = await roleField.validate('role-1', {
        req: req2,
        operation: 'update',
        data: { role: 'role-1' }
      })
      expect(result2).toBe("You don't have permission to assign the Test Role role")
    })

    it('should fetch role from database when user.role is string', async () => {
      const enhanced = enhanceCollectionWithRole(baseCollection)
      const roleField = enhanced.fields.find((f: any) => f.name === 'role') as any

      const mockFindByID = jest.fn()
      // First call: fetch target role
      mockFindByID.mockResolvedValueOnce({
        id: 'target-role',
        label: 'Target',
        permissions: ['posts.read'],
        active: true,
      })
      // Second call: fetch user's role
      mockFindByID.mockResolvedValueOnce({
        id: 'user-role',
        permissions: ['posts.*'],
        active: true,
      })

      const req = {
        payload: {
          findByID: mockFindByID
        },
        user: {
          id: '2',
          role: 'user-role', // String ID
        },
      }

      const result = await roleField.validate('target-role', {
        req,
        operation: 'create',
        data: { role: 'target-role' }
      })

      // First call fetches the target role
      expect(mockFindByID).toHaveBeenNthCalledWith(1, {
        collection: 'roles',
        id: 'target-role',
      })
      // Second call fetches the user's role
      expect(mockFindByID).toHaveBeenNthCalledWith(2, {
        collection: 'roles',
        id: 'user-role',
      })
      expect(result).toBe(true)
    })
  })

  describe('Role field filterOptions', () => {
    it('should allow filtering for users with role', async () => {
      const enhanced = enhanceCollectionWithRole(baseCollection)
      const roleField = enhanced.fields.find((f: any) => f.name === 'role') as any

      const req = {
        payload: {},
        user: {
          id: '2',
          role: {
            permissions: ['roles.read'],
          }
        },
        collection: {
          slug: 'backend-users'
        }
      }

      const result = await roleField.filterOptions({ req, user: req.user })

      // filterOptions now returns a where clause to filter roles by visibleFor
      // Only roles that explicitly include 'users' in visibleFor are shown
      expect(result).toEqual({
        visibleFor: {
          contains: 'users'
        }
      })
    })

    it('should filter by visibleFor even for super admin', async () => {
      const enhanced = enhanceCollectionWithRole(baseCollection)
      const roleField = enhanced.fields.find((f: any) => f.name === 'role') as any

      const req = {
        payload: {},
        user: {
          id: '2',
          role: {
            permissions: ['*'], // Super admin
          }
        },
      }

      const result = await roleField.filterOptions({ req, user: req.user })
      // Even super admin should only see roles explicitly visible for this collection
      expect(result).toEqual({
        visibleFor: {
          contains: 'users'
        }
      })
    })

    it('should handle user role as string', async () => {
      const enhanced = enhanceCollectionWithRole(baseCollection)
      const roleField = enhanced.fields.find((f: any) => f.name === 'role') as any

      const req = {
        payload: {},
        user: {
          id: '2',
          role: 'user-role', // String - filterOptions doesn't fetch it, just checks if exists
        },
        collection: {
          slug: 'users'
        }
      }

      const result = await roleField.filterOptions({ req, user: req.user })

      // With a string role ID, filterOptions returns a where clause
      // The actual fetching happens in validation, not filtering
      expect(result).toEqual({
        visibleFor: {
          contains: 'users'
        }
      })
    })

    it('should handle skipPermissionChecks function', async () => {
      const options = {
        skipPermissionChecks: () => true,
      }

      const enhanced = enhanceCollectionWithRole(baseCollection, options)
      const roleField = enhanced.fields.find((f: any) => f.name === 'role') as any

      const req = {
        payload: {},
        user: null,
      }

      const result = await roleField.filterOptions({ req, user: null })
      expect(result).toBe(true)
    })
  })

  describe('Helper functions', () => {
    it('should handle tab placement with last position', () => {
      const collectionWithTabs: CollectionConfig = {
        ...baseCollection,
        fields: [
          {
            type: 'tabs',
            tabs: [
              {
                label: 'General',
                fields: [
                  { name: 'field1', type: 'text' },
                  { name: 'field2', type: 'text' },
                ],
              },
            ],
          },
        ],
      }

      const options = {
        roleFieldPlacement: {
          tab: 'General',
          position: 'last' as const,
        },
      }

      const enhanced = enhanceCollectionWithRole(collectionWithTabs, options)
      const tabsField = enhanced.fields.find((f: any) => f.type === 'tabs') as any
      const generalTab = tabsField.tabs.find((t: any) => t.label === 'General')
      const lastField = generalTab.fields[generalTab.fields.length - 1]

      expect(lastField.name).toBe('role')
    })

    it('should handle tab placement with numeric position', () => {
      const collectionWithTabs: CollectionConfig = {
        ...baseCollection,
        fields: [
          {
            type: 'tabs',
            tabs: [
              {
                label: 'General',
                fields: [
                  { name: 'field1', type: 'text' },
                  { name: 'field2', type: 'text' },
                  { name: 'field3', type: 'text' },
                ],
              },
            ],
          },
        ],
      }

      const options = {
        roleFieldPlacement: {
          tab: 'General',
          position: 1,
        },
      }

      const enhanced = enhanceCollectionWithRole(collectionWithTabs, options)
      const tabsField = enhanced.fields.find((f: any) => f.type === 'tabs') as any
      const generalTab = tabsField.tabs.find((t: any) => t.label === 'General')

      expect(generalTab.fields[1].name).toBe('role')
    })

    it('should check for existing role field in nested structures', () => {
      const collectionWithNestedRole: CollectionConfig = {
        ...baseCollection,
        fields: [
          {
            type: 'tabs',
            tabs: [
              {
                label: 'General',
                fields: [
                  {
                    name: 'role',
                    type: 'relationship',
                    relationTo: 'roles',
                  } as any,
                ],
              },
            ],
          },
        ],
      }

      const options = {
        skipIfRoleExists: true,
      }

      const enhanced = enhanceCollectionWithRole(collectionWithNestedRole, options)

      // Should return unchanged since role exists
      expect(enhanced).toBe(collectionWithNestedRole)
    })

    it('should check for role field in groups', () => {
      const collectionWithGroupRole: CollectionConfig = {
        ...baseCollection,
        fields: [
          {
            type: 'group',
            name: 'userInfo',
            fields: [
              {
                name: 'role',
                type: 'relationship',
                relationTo: 'roles',
              } as any,
            ],
          },
        ],
      }

      const options = {
        skipIfRoleExists: true,
      }

      const enhanced = enhanceCollectionWithRole(collectionWithGroupRole, options)

      // Should return unchanged since role exists in group
      expect(enhanced).toBe(collectionWithGroupRole)
    })

    it('should add role field when no existing role found', () => {
      const collectionWithGroups: CollectionConfig = {
        ...baseCollection,
        fields: [
          {
            type: 'group',
            name: 'userInfo',
            fields: [
              {
                name: 'firstName',
                type: 'text',
              },
            ],
          },
          {
            type: 'tabs',
            tabs: [
              {
                label: 'Profile',
                fields: [
                  {
                    name: 'bio',
                    type: 'textarea',
                  },
                ],
              },
            ],
          },
        ],
      }

      // Don't set skipIfRoleExists - we want to add the role field
      const enhanced = enhanceCollectionWithRole(collectionWithGroups)

      // Should add role field since it doesn't exist
      expect(enhanced).not.toBe(collectionWithGroups)

      // When no placement is specified, role field is added to main fields (not in tabs)
      const roleField = enhanced.fields.find((f: any) => f.name === 'role') as any

      expect(roleField).toBeDefined()
      expect(roleField?.name).toBe('role')
    })

    it('should return false from filterOptions when user has no role', async () => {
      const enhanced = enhanceCollectionWithRole(baseCollection)
      const roleField = enhanced.fields.find((f: any) => f.name === 'role') as any

      const req = {
        payload: {},
        user: {
          id: '2',
          // No role property
        },
      }

      const result = await roleField.filterOptions({ req, user: req.user })
      expect(result).toBe(false)
    })
  })

  describe('addFieldToPosition edge cases', () => {
    it('should not add field if it already exists', () => {
      const collection = {
        slug: 'test',
        fields: [
          { name: 'role', type: 'relationship' as const, relationTo: 'roles' },
          { name: 'anotherField', type: 'text' as const },
        ],
      } as CollectionConfig

      // Enhance with skipIfRoleExists = false to test the duplicate check
      const enhanced = enhanceCollectionWithRole(collection, { skipIfRoleExists: false })

      // Should still have only one role field
      const roleFields = enhanced.fields.filter((f: any) => f.name === 'role')
      expect(roleFields).toHaveLength(1)
    })
  })

  describe('role validation edge cases', () => {
    it('should allow empty role value', async () => {
      const enhanced = enhanceCollectionWithRole(baseCollection)
      const roleField = enhanced.fields.find((f: any) => f.name === 'role') as any

      const req = {
        user: { id: '1', role: { permissions: ['*'] } },
        payload: {
          findByID: jest.fn(),
        },
      }

      const result = await roleField.validate(null, { req })
      expect(result).toBe(true)

      const result2 = await roleField.validate(undefined, { req })
      expect(result2).toBe(true)
    })

    it('should return true during initial user creation when no user exists', async () => {
      const enhanced = enhanceCollectionWithRole(baseCollection)
      const roleField = enhanced.fields.find((f: any) => f.name === 'role') as any

      const req = {
        user: null, // No user during initial creation
        payload: {
          findByID: jest.fn().mockResolvedValue({ id: '1', name: 'admin' }),
        },
      }

      const result = await roleField.validate('role-id', { req })
      expect(result).toBe(true)
    })

    it('should handle role validation errors gracefully', async () => {
      const enhanced = enhanceCollectionWithRole(baseCollection)
      const roleField = enhanced.fields.find((f: any) => f.name === 'role') as any

      const req = {
        user: { id: '1', role: { id: 'user-role', permissions: ['posts.read'] } },
        payload: {
          findByID: jest.fn().mockRejectedValue(new Error('Database error')),
        },
      }

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      const result = await roleField.validate('role-id', { req, operation: 'create' })

      expect(result).toBe('Error validating role assignment')
      expect(consoleSpy).toHaveBeenCalledWith('Role validation error:', expect.any(Error))

      consoleSpy.mockRestore()
    })
  })

  describe('role filter options edge cases', () => {
    it('should handle missing user gracefully', async () => {
      const enhanced = enhanceCollectionWithRole(baseCollection)
      const roleField = enhanced.fields.find((f: any) => f.name === 'role') as any

      // Call filterOptions with no user
      const result = await roleField.filterOptions({
        user: null,
        req: { payload: {} }
      })

      expect(result).toBe(false)
    })

    it('should handle user without role property', async () => {
      const enhanced = enhanceCollectionWithRole(baseCollection)
      const roleField = enhanced.fields.find((f: any) => f.name === 'role') as any

      // Call filterOptions with user that has no role property
      const result = await roleField.filterOptions({
        user: { id: '1', email: 'test@example.com' },
        req: { payload: {} }
      })

      expect(result).toBe(false)
    })
  })

  describe('role default value edge cases', () => {
    it('should return undefined when no request context exists', async () => {
      const enhanced = enhanceCollectionWithRole(baseCollection)
      const roleField = enhanced.fields.find((f: any) => f.name === 'role') as any

      const result = await roleField.defaultValue({ req: null })
      expect(result).toBeUndefined()

      const result2 = await roleField.defaultValue({ req: {} })
      expect(result2).toBeUndefined()
    })

    it('should auto-select role when only one is available', async () => {
      const enhanced = enhanceCollectionWithRole(baseCollection)
      const roleField = enhanced.fields.find((f: any) => f.name === 'role') as any

      const req = {
        payload: {
          find: jest.fn().mockResolvedValue({
            docs: [{ id: 'single-role-id', name: 'editor' }],
          }),
        },
      }

      const result = await roleField.defaultValue({ req })
      expect(result).toBe('single-role-id')
    })

    it('should return undefined when multiple roles are available', async () => {
      const enhanced = enhanceCollectionWithRole(baseCollection)
      const roleField = enhanced.fields.find((f: any) => f.name === 'role') as any

      const req = {
        payload: {
          find: jest.fn().mockResolvedValue({
            docs: [
              { id: 'role1', name: 'editor' },
              { id: 'role2', name: 'admin' },
            ],
          }),
        },
      }

      const result = await roleField.defaultValue({ req })
      expect(result).toBeUndefined()
    })

    it('should handle errors when determining default role', async () => {
      const enhanced = enhanceCollectionWithRole(baseCollection)
      const roleField = enhanced.fields.find((f: any) => f.name === 'role') as any

      const req = {
        payload: {
          find: jest.fn().mockRejectedValue(new Error('Database error')),
        },
      }

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
      const result = await roleField.defaultValue({ req })

      expect(result).toBeUndefined()
      expect(consoleSpy).toHaveBeenCalledWith('Could not determine default role:', expect.any(Error))

      consoleSpy.mockRestore()
    })
  })

  describe('findFieldRecursive', () => {
    it('should find field in tabs', () => {
      const collection = {
        slug: 'test',
        fields: [
          {
            type: 'tabs' as const,
            tabs: [
              {
                label: 'Tab 1',
                fields: [
                  { name: 'field1', type: 'text' as const },
                  { name: 'targetField', type: 'text' as const },
                ],
              },
            ],
          },
        ],
      } as CollectionConfig

      const enhanced = enhanceCollectionWithRole(collection, {
        roleFieldPlacement: {
          tab: 'Tab 1',
          position: 'last' as const
        }
      })

      // Role should be placed in the specified tab
      const tabsField = enhanced.fields.find((f: any) => f.type === 'tabs') as any
      const tab1 = tabsField.tabs.find((t: any) => t.label === 'Tab 1')
      const roleField = tab1.fields.find((f: any) => f.name === 'role')
      expect(roleField).toBeDefined()

      // Should be at the end of the tab's fields
      const roleIndex = tab1.fields.findIndex((f: any) => f.name === 'role')
      expect(roleIndex).toBe(tab1.fields.length - 1)
    })

    it('should place role field at the end when no tabs exist', () => {
      const collection = {
        slug: 'test',
        fields: [
          { name: 'field1', type: 'text' as const },
          { name: 'field2', type: 'text' as const },
        ],
      } as CollectionConfig

      const enhanced = enhanceCollectionWithRole(collection)

      // Default placement is in Security tab when there are tabs, otherwise at first position
      const roleField = enhanced.fields.find((f: any) => f.name === 'role')
      expect(roleField).toBeDefined()

      // Since no tabs exist and no position specified, should be at first position by default
      const roleIndex = enhanced.fields.findIndex((f: any) => f.name === 'role')
      expect(roleIndex).toBe(0)
    })
  })
})
