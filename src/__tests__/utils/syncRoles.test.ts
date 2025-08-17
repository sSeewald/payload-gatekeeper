import { syncSystemRoles } from '../../utils/syncRoles'
import type { DefaultRole } from '../../utils/syncRoles'
import crypto from 'crypto'

describe('syncSystemRoles', () => {
  // In-memory role database for blackbox testing
  let roleStore: Map<string, any>
  let roleIdCounter: number
  let mockPayload: any

  // Helper to generate the same hash as the implementation
  const generateRoleHash = (permissions: string[], visibleFor?: string[]): string => {
    const data = JSON.stringify({ 
      permissions: permissions.sort(),
      visibleFor: visibleFor ? visibleFor.sort() : []
    })
    return crypto
      .createHash('sha256')
      .update(data)
      .digest('hex')
      .substring(0, 16)
  }

  beforeEach(() => {
    // Initialize in-memory database
    roleStore = new Map()
    roleIdCounter = 1

    // Create a realistic mock payload that simulates database behavior
    mockPayload = {
      find: async ({ where }: any) => {
        const nameEquals = where?.name?.equals
        const roles = Array.from(roleStore.values())
        const docs = nameEquals 
          ? roles.filter(r => r.name === nameEquals)
          : roles
        return { docs }
      },
      findByID: async ({ id }: any) => {
        return roleStore.get(id) || null
      },
      create: async ({ data }: any) => {
        const id = `role-${roleIdCounter++}`
        const newRole = { id, ...data }
        roleStore.set(id, newRole)
        return newRole
      },
      update: async ({ id, data }: any) => {
        const existing = roleStore.get(id)
        if (!existing) {
          throw new Error('Role not found')
        }
        const updated = { ...existing, ...data }
        roleStore.set(id, updated)
        return updated
      }
    }

    // Suppress console logs during tests
    jest.spyOn(console, 'info').mockImplementation(() => {})
    jest.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  const testRoles: DefaultRole[] = [
    {
      name: 'admin',
      label: 'Administrator',
      permissions: ['posts.*', 'media.*'],
      active: true,
      description: 'Admin role',
    },
    {
      name: 'editor',
      label: 'Editor',
      permissions: ['posts.read', 'posts.update'],
      active: true,
      visibleFor: ['backend-users'],
    },
  ]

  it('should create new roles that do not exist', async () => {
    const result = await syncSystemRoles(mockPayload, testRoles)

    expect(result.created).toHaveLength(2)
    expect(result.created).toContain('admin')
    expect(result.created).toContain('editor')
    expect(result.updated).toHaveLength(0)
    expect(result.failed).toHaveLength(0)

    // Verify roles were actually created in the store
    const storedRoles = Array.from(roleStore.values())
    expect(storedRoles).toHaveLength(2)
    
    const adminRole = storedRoles.find(r => r.name === 'admin')
    expect(adminRole).toBeDefined()
    expect(adminRole.label).toBe('Administrator')
    expect(adminRole.active).toBe(true)
    expect(adminRole.description).toBe('Admin role')
    expect(adminRole.systemManaged).toBe(true)
    expect(adminRole.permissions).toEqual(expect.arrayContaining(['posts.*', 'media.*']))
    expect(adminRole.configHash).toBe(generateRoleHash(['posts.*', 'media.*']))
    expect(adminRole.configVersion).toBe(1)
    
    const editorRole = storedRoles.find(r => r.name === 'editor')
    expect(editorRole).toBeDefined()
    expect(editorRole.visibleFor).toEqual(['backend-users'])
  })

  it('should update existing roles when configuration changes', async () => {
    // Pre-populate store with existing role
    const existingRole = {
      id: 'role-1',
      name: 'admin',
      label: 'Old Admin',
      permissions: ['posts.read'],
      active: false,
      configHash: 'old-hash',
      configVersion: 1,
      systemManaged: true,
    }
    roleStore.set('role-1', existingRole)

    const result = await syncSystemRoles(mockPayload, [testRoles[0]])

    expect(result.created).toHaveLength(0)
    expect(result.updated).toHaveLength(1)
    expect(result.updated).toContain('admin')
    expect(result.failed).toHaveLength(0)

    // Verify the role was actually updated in the store
    const updatedRole = roleStore.get('role-1')
    expect(updatedRole).toBeDefined()
    expect(updatedRole.permissions).toEqual(expect.arrayContaining(['posts.*', 'media.*']))
    expect(updatedRole.permissions).toHaveLength(2)
    expect(updatedRole.configHash).toBe(generateRoleHash(['posts.*', 'media.*']))
    expect(updatedRole.configVersion).toBe(2) // Incremented
  })

  it('should not update roles when configuration has not changed', async () => {
    const correctHash = generateRoleHash(['posts.*', 'media.*'])
    
    // Pre-populate with role that has the same config
    const existingRole = {
      id: 'role-1',
      name: 'admin',
      label: 'Administrator',
      permissions: ['posts.*', 'media.*'],
      active: true,
      description: 'Admin role',
      configHash: correctHash,
      configVersion: 1,
      systemManaged: true,
    }
    roleStore.set('role-1', existingRole)

    const result = await syncSystemRoles(mockPayload, [testRoles[0]])

    expect(result.created).toHaveLength(0)
    expect(result.updated).toHaveLength(0)
    expect(result.failed).toHaveLength(0)
    
    // Verify role was not modified
    const unchangedRole = roleStore.get('role-1')
    expect(unchangedRole).toEqual(existingRole)
  })

  it('should handle creation failures gracefully', async () => {
    // Override create to simulate failure
    mockPayload.create = async () => {
      throw new Error('Database error')
    }

    const result = await syncSystemRoles(mockPayload, testRoles)

    expect(result.created).toHaveLength(0)
    expect(result.updated).toHaveLength(0)
    expect(result.failed).toHaveLength(2)

    expect(result.failed[0]).toEqual({
      role: 'admin',
      error: 'Create failed: Database error',
    })

    // Verify nothing was added to the store
    expect(roleStore.size).toBe(0)
  })

  it('should handle update failures gracefully', async () => {
    // Pre-populate with existing role
    const existingRole = {
      id: 'role-1',
      name: 'admin',
      configHash: 'old-hash',
      configVersion: 1,
      systemManaged: true,
    }
    roleStore.set('role-1', existingRole)

    // Override update to simulate failure
    mockPayload.update = async () => {
      throw new Error('Update failed')
    }

    const result = await syncSystemRoles(mockPayload, [testRoles[0]])

    expect(result.created).toHaveLength(0)
    expect(result.updated).toHaveLength(0)
    expect(result.failed).toHaveLength(1)

    expect(result.failed[0]).toEqual({
      role: 'admin',
      error: 'Update failed (likely concurrent update): Update failed',
    })

    // Verify role was not modified
    const unchangedRole = roleStore.get('role-1')
    expect(unchangedRole).toEqual(existingRole)
  })

  it('should handle mixed success and failure', async () => {
    let createCallCount = 0
    mockPayload.create = async ({ data }: any) => {
      createCallCount++
      if (createCallCount === 1) {
        // First call succeeds
        const id = `role-${roleIdCounter++}`
        const newRole = { id, ...data }
        roleStore.set(id, newRole)
        return newRole
      } else {
        // Second call fails
        throw new Error('Create failed')
      }
    }

    const result = await syncSystemRoles(mockPayload, testRoles)

    expect(result.created).toHaveLength(1)
    expect(result.created).toContain('admin')
    expect(result.updated).toHaveLength(0)
    expect(result.failed).toHaveLength(1)
    expect(result.failed[0].role).toBe('editor')

    // Verify only one role was created
    expect(roleStore.size).toBe(1)
    const createdRole = Array.from(roleStore.values())[0]
    expect(createdRole.name).toBe('admin')
  })

  it('should preserve visibleFor field when syncing', async () => {
    await syncSystemRoles(mockPayload, [testRoles[1]])

    // Verify the role was created with visibleFor
    const roles = Array.from(roleStore.values())
    expect(roles).toHaveLength(1)
    const editorRole = roles[0]
    expect(editorRole.name).toBe('editor')
    expect(editorRole.visibleFor).toEqual(['backend-users'])
  })

  it('should handle empty roles array', async () => {
    const result = await syncSystemRoles(mockPayload, [])

    expect(result.created).toHaveLength(0)
    expect(result.updated).toHaveLength(0)
    expect(result.failed).toHaveLength(0)
    
    // Verify no database operations occurred
    expect(roleStore.size).toBe(0)
  })

  it('should handle find operation failure', async () => {
    // Override find to simulate database failure
    mockPayload.find = async () => {
      throw new Error('Database connection failed')
    }

    const result = await syncSystemRoles(mockPayload, testRoles)

    expect(result.created).toHaveLength(0)
    expect(result.updated).toHaveLength(0)
    expect(result.failed).toHaveLength(2) // Both roles should fail
    expect(result.failed[0].error).toBe('Database connection failed')
    expect(result.failed[1].error).toBe('Database connection failed')

    // Verify no roles were created
    expect(roleStore.size).toBe(0)
  })

  it('should skip non-system-managed roles', async () => {
    // Pre-populate with user-created role (not system-managed)
    const userCreatedRole = {
      id: 'role-1',
      name: 'admin',
      label: 'User Admin',
      permissions: ['custom.permission'],
      configHash: 'user-hash',
      systemManaged: false, // User-created, not system-managed
    }
    roleStore.set('role-1', userCreatedRole)

    const result = await syncSystemRoles(mockPayload, [testRoles[0]])

    expect(result.created).toHaveLength(0)
    expect(result.updated).toHaveLength(0)
    expect(result.skipped).toHaveLength(1)
    expect(result.skipped).toContain('admin')
    expect(result.failed).toHaveLength(0)

    // Verify the user-created role was not modified
    const unchangedRole = roleStore.get('role-1')
    expect(unchangedRole).toEqual(userCreatedRole)
  })

  it('should handle concurrent updates with optimistic locking', async () => {
    // Pre-populate with existing role that needs updating
    const existingRole = {
      id: 'role-1',
      name: 'admin',
      permissions: ['old.permission'],
      configHash: 'old-hash',
      configVersion: 1,
      systemManaged: true,
    }
    roleStore.set('role-1', existingRole)

    // Override findByID to simulate another process updating the role
    mockPayload.findByID = async ({ id }: any) => {
      // Simulate that another process updated the role (version mismatch)
      return { ...roleStore.get(id), configVersion: 2 }
    }

    const result = await syncSystemRoles(mockPayload, [testRoles[0]])

    expect(result.created).toHaveLength(0)
    expect(result.updated).toHaveLength(0)
    expect(result.failed).toHaveLength(1)
    expect(result.failed[0]).toEqual({
      role: 'admin',
      error: 'Concurrent update detected',
    })
  })

  it('should increment configVersion on successful update', async () => {
    // Pre-populate with existing role
    const existingRole = {
      id: 'role-1',
      name: 'admin',
      permissions: ['old.permission'],
      configHash: 'old-hash',
      configVersion: 3,
      systemManaged: true,
    }
    roleStore.set('role-1', existingRole)

    const result = await syncSystemRoles(mockPayload, [testRoles[0]])

    expect(result.updated).toHaveLength(1)
    
    // Verify version was incremented
    const updatedRole = roleStore.get('role-1')
    expect(updatedRole.configVersion).toBe(4) // 3 + 1
  })

  it('should set default values for optional fields', async () => {
    const minimalRole: DefaultRole = {
      name: 'minimal',
      label: 'Minimal Role',
      permissions: ['test.permission'],
      // No active, protected, description, or visibleFor
    }

    await syncSystemRoles(mockPayload, [minimalRole])

    const createdRole = Array.from(roleStore.values())[0]
    expect(createdRole.active).toBe(true) // Default value
    expect(createdRole.systemManaged).toBe(true)
    expect(createdRole.configVersion).toBe(1)
    expect(createdRole.configHash).toBeDefined()
  })
})
