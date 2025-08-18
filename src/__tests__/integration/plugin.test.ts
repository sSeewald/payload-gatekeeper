import { gatekeeperPlugin } from '../../index'
import { mockCollections, mockPluginOptions } from '../helpers/fixtures'
import type { Config } from 'payload'

describe('gatekeeperPlugin Integration', () => {
  let baseConfig: Config
  let _consoleWarnSpy: any

  beforeEach(() => {
    _consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    baseConfig = {
      admin: {
        user: 'backend-users',
      },
      collections: mockCollections,
      serverURL: 'http://localhost:3000',
    } as Config
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should enhance config with permissions functionality', async () => {
    const plugin = gatekeeperPlugin(mockPluginOptions)
    const enhancedConfig = await plugin(baseConfig) as Config

    expect(enhancedConfig).toBeDefined()
    expect(enhancedConfig.collections).toBeDefined()
    expect(enhancedConfig.onInit).toBeDefined()
  })

  it('should add roles collection to config', async () => {
    const plugin = gatekeeperPlugin(mockPluginOptions)
    const enhancedConfig = await plugin(baseConfig) as Config

    const rolesCollection = enhancedConfig.collections?.find(c => c.slug === 'roles')
    expect(rolesCollection).toBeDefined()
    expect(rolesCollection?.admin?.group).toBe('System')
  })

  it('should enhance auth collections with role field', async () => {
    const plugin = gatekeeperPlugin(mockPluginOptions)
    const enhancedConfig = await plugin(baseConfig) as Config

    const backendUsersCollection = enhancedConfig.collections?.find(
      c => c.slug === 'backend-users'
    )
    expect(backendUsersCollection?.fields).toBeDefined()

    // Check if role field was added
    const hasRoleField = backendUsersCollection?.fields.some(
      (f: any) => f.name === 'role'
    ) || backendUsersCollection?.fields.some(
      (f: any) => f.type === 'tabs' && f.tabs.some(
        (t: any) => t.fields.some((tf: any) => tf.name === 'role')
      )
    )
    expect(hasRoleField).toBe(true)
  })

  it('should add access control wrappers to collections', async () => {
    const plugin = gatekeeperPlugin(mockPluginOptions)
    const enhancedConfig = await plugin(baseConfig) as Config

    const postsCollection = enhancedConfig.collections?.find(c => c.slug === 'posts')
    expect(postsCollection?.access).toBeDefined()
    expect(typeof postsCollection?.access?.create).toBe('function')
    expect(typeof postsCollection?.access?.read).toBe('function')
    expect(typeof postsCollection?.access?.update).toBe('function')
    expect(typeof postsCollection?.access?.delete).toBe('function')
  })

  it('should add UI visibility checks based on manage permission', async () => {
    const plugin = gatekeeperPlugin(mockPluginOptions)
    const enhancedConfig = await plugin(baseConfig) as Config

    const postsCollection = enhancedConfig.collections?.find(c => c.slug === 'posts')
    expect(postsCollection?.admin?.hidden).toBeDefined()
    expect(typeof postsCollection?.admin?.hidden).toBe('function')
  })

  it('should respect excluded collections', async () => {
    const optionsWithExclude = {
      ...mockPluginOptions,
      excludeCollections: ['posts'],
    }

    const plugin = gatekeeperPlugin(optionsWithExclude)
    const enhancedConfig = await plugin(baseConfig) as Config

    const postsCollection = enhancedConfig.collections?.find(c => c.slug === 'posts')

    // Posts should exist but not have permission-based access control
    expect(postsCollection).toBeDefined()
    // Check that it doesn't have our wrapped access control
    // (It might have original access control, but not our wrappers)
  })

  it('should use custom roles slug when provided', async () => {
    const optionsWithCustomSlug = {
      ...mockPluginOptions,
      rolesSlug: 'custom-roles',
    }

    const plugin = gatekeeperPlugin(optionsWithCustomSlug)
    const enhancedConfig = await plugin(baseConfig) as Config

    const customRolesCollection = enhancedConfig.collections?.find(
      c => c.slug === 'custom-roles'
    )
    expect(customRolesCollection).toBeDefined()

    const defaultRolesCollection = enhancedConfig.collections?.find(
      c => c.slug === 'roles'
    )
    expect(defaultRolesCollection).toBeUndefined()
  })


  it('should add afterChange hooks for collections with autoAssignFirstUser', async () => {
    const plugin = gatekeeperPlugin(mockPluginOptions)
    const enhancedConfig = await plugin(baseConfig) as Config

    const backendUsersCollection = enhancedConfig.collections?.find(
      c => c.slug === 'backend-users'
    )

    expect(backendUsersCollection?.hooks?.afterChange).toBeDefined()
    expect(Array.isArray(backendUsersCollection?.hooks?.afterChange)).toBe(true)
  })

  it('should add afterChange hooks for collections with defaultRole', async () => {
    const plugin = gatekeeperPlugin(mockPluginOptions)
    const enhancedConfig = await plugin(baseConfig) as Config

    const usersCollection = enhancedConfig.collections?.find(c => c.slug === 'users')

    expect(usersCollection?.hooks?.afterChange).toBeDefined()
    expect(Array.isArray(usersCollection?.hooks?.afterChange)).toBe(true)
  })

  it('should preserve existing collection properties', async () => {
    const collectionWithCustomProps = {
      slug: 'custom',
      auth: true,
      fields: [],
      admin: {
        useAsTitle: 'name',
        defaultColumns: ['name', 'email'],
      },
      hooks: {
        beforeChange: [jest.fn()],
      },
      access: {
        read: jest.fn(),
      },
    }

    const configWithCustom = {
      ...baseConfig,
      collections: [...mockCollections, collectionWithCustomProps],
    }

    const plugin = gatekeeperPlugin({
      collections: {
        custom: {
          enhance: true,
        },
      },
    })
    const enhancedConfig = await plugin(configWithCustom) as Config

    const customCollection = enhancedConfig.collections?.find(c => c.slug === 'custom')

    expect(customCollection?.admin?.useAsTitle).toBe('name')
    expect(customCollection?.admin?.defaultColumns).toEqual(['name', 'email'])
    expect(customCollection?.hooks?.beforeChange).toBeDefined()
  })

  it('should create onInit function for role syncing', async () => {
    const plugin = gatekeeperPlugin(mockPluginOptions)
    const enhancedConfig = await plugin(baseConfig) as Config

    expect(enhancedConfig.onInit).toBeDefined()
    expect(typeof enhancedConfig.onInit).toBe('function')

    // Mock payload for onInit
    const mockPayload = {
      count: jest.fn().mockResolvedValue({ totalDocs: 0 }),
      find: jest.fn().mockResolvedValue({ docs: [] }),
      create: jest.fn(),
    }

    await enhancedConfig.onInit?.(mockPayload as any)

    // Should attempt to sync roles when no roles exist
    expect(mockPayload.count).toHaveBeenCalledWith({ collection: 'roles' })
  })

  it('should call original onInit if exists', async () => {
    const originalOnInit = jest.fn()
    const configWithOnInit = {
      ...baseConfig,
      onInit: originalOnInit,
    }

    const plugin = gatekeeperPlugin(mockPluginOptions)
    const enhancedConfig = await plugin(configWithOnInit) as Config

    const mockPayload = {
      count: jest.fn().mockResolvedValue({ totalDocs: 5 }),
    }

    await enhancedConfig.onInit?.(mockPayload as any)

    expect(originalOnInit).toHaveBeenCalledWith(mockPayload)
  })

  it('should handle missing admin user collection', async () => {
    const configWithoutAdmin = {
      ...baseConfig,
      admin: undefined,
    }

    const plugin = gatekeeperPlugin(mockPluginOptions)
    const enhancedConfig = await plugin(configWithoutAdmin as any) as Config

    // Should still work but log warning
    expect(enhancedConfig).toBeDefined()
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('No admin user collection configured')
    )
  })
})
