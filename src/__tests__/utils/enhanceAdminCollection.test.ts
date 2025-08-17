import { enhanceCollectionWithRole } from '../../utils/enhanceAdminCollection'
import type { CollectionConfig } from 'payload'
import type { GatekeeperOptions } from '../../types'

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

    const options: GatekeeperOptions = {
      skipIfRoleExists: true,
    }

    const enhanced = enhanceCollectionWithRole(collectionWithRole, options)

    // Should return the original collection unchanged
    expect(enhanced).toBe(collectionWithRole)
  })

  it('should place role field in sidebar when specified', () => {
    const options: GatekeeperOptions = {
      roleFieldPlacement: {
        position: 'sidebar',
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

    const options: GatekeeperOptions = {
      roleFieldPlacement: {
        tab: 'Security',
        position: 'first',
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

    const options: GatekeeperOptions = {
      roleFieldPlacement: {
        tab: 'NonExistentTab',
        position: 'first',
      },
    }

    const enhanced = enhanceCollectionWithRole(collectionWithTabs, options)
    const tabsField = enhanced.fields.find((f: any) => f.type === 'tabs') as any
    const newTab = tabsField.tabs.find((t: any) => t.label === 'Security')

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
    const options: GatekeeperOptions = {
      roleFieldPlacement: {
        position: 1,
      },
    }

    const enhanced = enhanceCollectionWithRole(baseCollection, options)

    expect((enhanced.fields[1] as any).name).toBe('role')
  })

  it('should position role field at last when specified', () => {
    const options: GatekeeperOptions = {
      roleFieldPlacement: {
        position: 'last',
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
    it('should allow changes during seeding mode', async () => {
      const options: GatekeeperOptions = {
        seedingMode: true,
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
      const options: GatekeeperOptions = {
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

      const options: GatekeeperOptions = {
        roleFieldPlacement: {
          tab: 'General',
          position: 'last',
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

      const options: GatekeeperOptions = {
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

      const options: GatekeeperOptions = {
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

      const options: GatekeeperOptions = {
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
      
      // Check inside tabs first (since there's a tabs field)
      const tabsField = enhanced.fields.find((f: any) => f.type === 'tabs') as any
      const securityTab = tabsField.tabs.find((t: any) => t.label === 'Security')
      const roleField = securityTab?.fields.find((f: any) => f.name === 'role')
      
      expect(roleField).toBeDefined()
      expect(roleField.name).toBe('role')
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
})
