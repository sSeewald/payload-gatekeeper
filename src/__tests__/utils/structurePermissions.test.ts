import { structurePermissions, getDisplayLabel } from '../../utils/structurePermissions'
import type { Permission } from '../../types'

describe('structurePermissions Utility', () => {
  describe('Basic Functionality', () => {
    it('should return empty array for empty input', () => {
      const result = structurePermissions([])
      expect(result).toEqual([])
    })

    it('should handle array of permissions', () => {
      const permissions: Permission[] = [
        { label: 'Read Posts', value: 'posts.read', category: 'posts', description: '' },
        { label: 'Create Users', value: 'users.create', category: 'users', description: '' },
        { label: 'Delete Media', value: 'media.delete', category: 'media', description: '' },
      ]
      const result = structurePermissions(permissions)
      
      expect(result).toHaveLength(3)
      expect(result[0]).toMatchObject({ value: 'media.delete', label: 'Delete Media' })
      expect(result[1]).toMatchObject({ value: 'posts.read', label: 'Read Posts' })
      expect(result[2]).toMatchObject({ value: 'users.create', label: 'Create Users' })
    })
  })

  describe('Category Grouping', () => {
    it('should group permissions by category', () => {
      const permissions: Permission[] = [
        { label: 'Read Posts', value: 'posts.read', category: 'posts', description: '' },
        { label: 'Create Posts', value: 'posts.create', category: 'posts', description: '' },
        { label: 'Read Users', value: 'users.read', category: 'users', description: '' },
      ]
      
      const result = structurePermissions(permissions)
      
      // Should be sorted by category alphabetically
      expect(result[0].category).toBe('posts')
      expect(result[1].category).toBe('posts')
      expect(result[2].category).toBe('users')
    })

    it('should put Special category first', () => {
      const permissions: Permission[] = [
        { label: 'Read Posts', value: 'posts.read', category: 'posts', description: '' },
        { label: 'Super Admin', value: '*', category: 'Special', description: '' },
        { label: 'Read Users', value: 'users.read', category: 'users', description: '' },
      ]
      
      const result = structurePermissions(permissions)
      
      expect(result[0].value).toBe('*')
      expect(result[0].category).toBe('Special')
    })

    it('should sort categories alphabetically (except Special)', () => {
      const permissions: Permission[] = [
        { label: 'Zebra Action', value: 'zebra.action', category: 'zebra', description: '' },
        { label: 'Read Posts', value: 'posts.read', category: 'posts', description: '' },
        { label: 'Super Admin', value: '*', category: 'Special', description: '' },
        { label: 'Analytics View', value: 'analytics.view', category: 'analytics', description: '' },
      ]
      
      const result = structurePermissions(permissions)
      
      // Special should always be first
      expect(result[0].category).toBe('Special')
      // Others should be alphabetical
      expect(result[1].category).toBe('analytics')
      expect(result[2].category).toBe('posts')
      expect(result[3].category).toBe('zebra')
    })
  })

  describe('Hierarchy and Indentation', () => {
    it('should create parent-child hierarchy for wildcard permissions', () => {
      const permissions: Permission[] = [
        { label: 'All Posts', value: 'posts.*', category: 'posts', description: '' },
        { label: 'Read Posts', value: 'posts.read', category: 'posts', description: '' },
        { label: 'Create Posts', value: 'posts.create', category: 'posts', description: '' },
      ]
      
      const result = structurePermissions(permissions)
      
      // Wildcard should be parent (first)
      expect(result[0].value).toBe('posts.*')
      expect(result[0].isParent).toBe(true)
      expect(result[0].indent).toBe(0)
      
      // Others should be children with indentation (manage, create, read order)
      expect(result[1].value).toBe('posts.create')
      expect(result[1].isParent).toBe(false)
      expect(result[1].indent).toBe(1)
      
      expect(result[2].value).toBe('posts.read')
      expect(result[2].isParent).toBe(false)
      expect(result[2].indent).toBe(1)
    })

    it('should order operations correctly', () => {
      const permissions: Permission[] = [
        { label: 'All Posts', value: 'posts.*', category: 'posts', description: '' },
        { label: 'Delete Posts', value: 'posts.delete', category: 'posts', description: '' },
        { label: 'Update Posts', value: 'posts.update', category: 'posts', description: '' },
        { label: 'Create Posts', value: 'posts.create', category: 'posts', description: '' },
        { label: 'Read Posts', value: 'posts.read', category: 'posts', description: '' },
        { label: 'Manage Posts', value: 'posts.manage', category: 'posts', description: '' },
      ]
      
      const result = structurePermissions(permissions)
      
      // Should be ordered: wildcard, manage, create, read, update, delete
      expect(result[0].value).toBe('posts.*')
      expect(result[1].value).toBe('posts.manage')
      expect(result[2].value).toBe('posts.create')
      expect(result[3].value).toBe('posts.read')
      expect(result[4].value).toBe('posts.update')
      expect(result[5].value).toBe('posts.delete')
    })

    it('should handle custom operations', () => {
      const permissions: Permission[] = [
        { label: 'All Posts', value: 'posts.*', category: 'posts', description: '' },
        { label: 'Publish Posts', value: 'posts.publish', category: 'posts', description: '' },
        { label: 'Archive Posts', value: 'posts.archive', category: 'posts', description: '' },
        { label: 'Read Posts', value: 'posts.read', category: 'posts', description: '' },
      ]
      
      const result = structurePermissions(permissions)
      
      // Standard operations should come first
      expect(result[1].value).toBe('posts.read')
      // Custom operations should be sorted alphabetically after standard ones
      expect(result[2].value).toBe('posts.archive')
      expect(result[3].value).toBe('posts.publish')
    })

    it('should handle permissions without wildcard', () => {
      const permissions: Permission[] = [
        { label: 'Read Posts', value: 'posts.read', category: 'posts', description: '' },
        { label: 'Create Posts', value: 'posts.create', category: 'posts', description: '' },
      ]
      
      const result = structurePermissions(permissions)
      
      // Without wildcard, all should be flat (no indentation)
      expect(result[0].indent).toBe(0)
      expect(result[0].isParent).toBe(false)
      expect(result[1].indent).toBe(0)
      expect(result[1].isParent).toBe(false)
    })
  })

  describe('Special and System Categories', () => {
    it('should handle Special permissions as flat', () => {
      const permissions: Permission[] = [
        { label: 'Super Admin', value: '*', category: 'Special', description: '' },
        { label: 'Create Any', value: '*.create', category: 'Special', description: '' },
        { label: 'Read Any', value: '*.read', category: 'Special', description: '' },
      ]
      
      const result = structurePermissions(permissions)
      
      // All Special permissions should be flat
      result.forEach(option => {
        expect(option.indent).toBe(0)
        expect(option.isParent).toBe(false)
        expect(option.category).toBe('Special')
      })
    })

    it('should handle custom permissions as flat', () => {
      const permissions: Permission[] = [
        { label: 'Export Data', value: 'export.data', category: 'export', description: '' },
        { label: 'Export Users', value: 'export.users', category: 'export', description: '' },
      ]
      
      const result = structurePermissions(permissions)
      
      // All custom permissions should be flat (no wildcard)
      result.forEach(option => {
        expect(option.indent).toBe(0)
        expect(option.isParent).toBe(false)
        expect(option.category).toBe('export')
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle permissions with no category', () => {
      const permissions: Permission[] = [
        { label: 'Read Posts', value: 'posts.read', description: '' } as Permission,
      ]
      
      const result = structurePermissions(permissions)
      
      // Should use 'Other' as default category
      expect(result[0].category).toBe('Other')
    })

    it('should handle mixed category types', () => {
      const permissions: Permission[] = [
        { label: 'Super Admin', value: '*', category: 'Special', description: '' },
        { label: 'Read Posts', value: 'posts.read', category: 'posts', description: '' },
        { label: 'Export Data', value: 'export.data', category: 'export', description: '' },
        { label: 'No Category', value: 'nocategory', description: '' } as Permission,
      ]
      
      const result = structurePermissions(permissions)
      
      // Order should be: Special, Other, export, posts (alphabetical after Special/Other)
      expect(result[0].category).toBe('Special')
      expect(result[1].category).toBe('Other')
      expect(result[2].category).toBe('export')
      expect(result[3].category).toBe('posts')
    })

    it('should preserve description field', () => {
      const permissions: Permission[] = [
        { label: 'Read Posts', value: 'posts.read', category: 'posts', description: 'Allows reading posts' },
      ]
      
      const result = structurePermissions(permissions)
      
      expect(result[0].description).toBe('Allows reading posts')
    })
  })
})

describe('getDisplayLabel', () => {
  it('should add indentation for level 1', () => {
    const option = {
      label: 'Read Posts',
      value: 'posts.read',
      indent: 1,
    }
    
    const result = getDisplayLabel(option)
    expect(result).toBe('  └─ Read Posts')
  })

  it('should not add indentation for level 0', () => {
    const option = {
      label: 'All Posts',
      value: 'posts.*',
      indent: 0,
    }
    
    const result = getDisplayLabel(option)
    expect(result).toBe('All Posts')
  })

  it('should handle undefined indent', () => {
    const option = {
      label: 'Test Label',
      value: 'test',
    }
    
    const result = getDisplayLabel(option)
    expect(result).toBe('Test Label')
  })
})