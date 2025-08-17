import { createUIVisibilityCheck, canSeeInUI } from '../../access/checkUIVisibility'

describe('checkUIVisibility', () => {
  describe('createUIVisibilityCheck', () => {
    it('should hide collection when user is not logged in', () => {
      const checkVisibility = createUIVisibilityCheck('posts')
      const result = checkVisibility({ user: null })
      
      expect(result).toBe(true) // true means hidden
    })

    it('should hide collection when user has no role', () => {
      const checkVisibility = createUIVisibilityCheck('posts')
      const result = checkVisibility({ user: { id: '1', email: 'test@example.com' } })
      
      expect(result).toBe(true) // hidden
    })

    it('should hide collection when role has no permissions', () => {
      const checkVisibility = createUIVisibilityCheck('posts')
      const user = {
        id: '1',
        email: 'test@example.com',
        role: {
          id: 'role-1',
          name: 'viewer',
          permissions: []
        }
      }
      const result = checkVisibility({ user })
      
      expect(result).toBe(true) // hidden
    })

    it('should show collection for super admin with * permission', () => {
      const checkVisibility = createUIVisibilityCheck('posts')
      const user = {
        id: '1',
        email: 'admin@example.com',
        role: {
          id: 'role-1',
          name: 'super_admin',
          permissions: ['*']
        }
      }
      const result = checkVisibility({ user })
      
      expect(result).toBe(false) // false means visible
    })

    it('should show collection when user has collection.* permission', () => {
      const checkVisibility = createUIVisibilityCheck('posts')
      const user = {
        id: '1',
        email: 'editor@example.com',
        role: {
          id: 'role-1',
          name: 'editor',
          permissions: ['posts.*']
        }
      }
      const result = checkVisibility({ user })
      
      expect(result).toBe(false) // visible
    })

    it('should show collection when user has collection.manage permission', () => {
      const checkVisibility = createUIVisibilityCheck('posts')
      const user = {
        id: '1',
        email: 'manager@example.com',
        role: {
          id: 'role-1',
          name: 'manager',
          permissions: ['posts.manage']
        }
      }
      const result = checkVisibility({ user })
      
      expect(result).toBe(false) // visible
    })

    it('should hide collection when user only has read permission', () => {
      const checkVisibility = createUIVisibilityCheck('posts')
      const user = {
        id: '1',
        email: 'reader@example.com',
        role: {
          id: 'role-1',
          name: 'reader',
          permissions: ['posts.read']
        }
      }
      const result = checkVisibility({ user })
      
      expect(result).toBe(true) // hidden - read permission is not enough
    })

    it('should hide collection when user has manage permission for different collection', () => {
      const checkVisibility = createUIVisibilityCheck('posts')
      const user = {
        id: '1',
        email: 'user@example.com',
        role: {
          id: 'role-1',
          name: 'user',
          permissions: ['media.manage', 'media.*']
        }
      }
      const result = checkVisibility({ user })
      
      expect(result).toBe(true) // hidden - permissions are for different collection
    })

    it('should handle role with undefined permissions array', () => {
      const checkVisibility = createUIVisibilityCheck('posts')
      const user = {
        id: '1',
        email: 'test@example.com',
        role: {
          id: 'role-1',
          name: 'broken',
          permissions: undefined
        }
      }
      const result = checkVisibility({ user })
      
      expect(result).toBe(true) // hidden
    })

    it('should handle role with null permissions array', () => {
      const checkVisibility = createUIVisibilityCheck('posts')
      const user = {
        id: '1',
        email: 'test@example.com',
        role: {
          id: 'role-1',
          name: 'broken',
          permissions: null as any
        }
      }
      const result = checkVisibility({ user })
      
      expect(result).toBe(true) // hidden
    })
  })

  describe('canSeeInUI', () => {
    it('should return false when user is null', () => {
      const result = canSeeInUI(null, 'posts')
      expect(result).toBe(false)
    })

    it('should return false when user is undefined', () => {
      const result = canSeeInUI(undefined, 'posts')
      expect(result).toBe(false)
    })

    it('should return false when user has no role', () => {
      const user = { id: '1', email: 'test@example.com' }
      const result = canSeeInUI(user, 'posts')
      expect(result).toBe(false)
    })

    it('should return true for super admin with * permission', () => {
      const user = {
        id: '1',
        email: 'admin@example.com',
        role: {
          id: 'role-1',
          name: 'super_admin',
          permissions: ['*']
        }
      }
      const result = canSeeInUI(user, 'posts')
      expect(result).toBe(true)
    })

    it('should return true when user has collection.* permission', () => {
      const user = {
        id: '1',
        email: 'editor@example.com',
        role: {
          id: 'role-1',
          name: 'editor',
          permissions: ['posts.*']
        }
      }
      const result = canSeeInUI(user, 'posts')
      expect(result).toBe(true)
    })

    it('should return true when user has collection.manage permission', () => {
      const user = {
        id: '1',
        email: 'manager@example.com',
        role: {
          id: 'role-1',
          name: 'manager',
          permissions: ['posts.manage', 'posts.read']
        }
      }
      const result = canSeeInUI(user, 'posts')
      expect(result).toBe(true)
    })

    it('should return false when user only has read/write permissions', () => {
      const user = {
        id: '1',
        email: 'user@example.com',
        role: {
          id: 'role-1',
          name: 'user',
          permissions: ['posts.read', 'posts.write', 'posts.update', 'posts.delete']
        }
      }
      const result = canSeeInUI(user, 'posts')
      expect(result).toBe(false) // No manage permission
    })

    it('should return false for wrong collection permissions', () => {
      const user = {
        id: '1',
        email: 'user@example.com',
        role: {
          id: 'role-1',
          name: 'user',
          permissions: ['media.manage']
        }
      }
      const result = canSeeInUI(user, 'posts')
      expect(result).toBe(false)
    })

    it('should handle empty permissions array', () => {
      const user = {
        id: '1',
        email: 'test@example.com',
        role: {
          id: 'role-1',
          name: 'empty',
          permissions: []
        }
      }
      const result = canSeeInUI(user, 'posts')
      expect(result).toBe(false)
    })

    it('should handle undefined permissions', () => {
      const user = {
        id: '1',
        email: 'test@example.com',
        role: {
          id: 'role-1',
          name: 'broken',
          permissions: undefined
        }
      }
      const result = canSeeInUI(user, 'posts')
      expect(result).toBe(false)
    })

    it('should handle null permissions', () => {
      const user = {
        id: '1',
        email: 'test@example.com',
        role: {
          id: 'role-1',
          name: 'broken',
          permissions: null as any
        }
      }
      const result = canSeeInUI(user, 'posts')
      expect(result).toBe(false)
    })

    it('should work with multiple collections in permissions', () => {
      const user = {
        id: '1',
        email: 'multi@example.com',
        role: {
          id: 'role-1',
          name: 'multi-manager',
          permissions: ['posts.manage', 'media.manage', 'users.read']
        }
      }
      
      expect(canSeeInUI(user, 'posts')).toBe(true)
      expect(canSeeInUI(user, 'media')).toBe(true)
      expect(canSeeInUI(user, 'users')).toBe(false) // Only read, not manage
    })

    it('should handle special collection names correctly', () => {
      const user = {
        id: '1',
        email: 'test@example.com',
        role: {
          id: 'role-1',
          name: 'special',
          permissions: ['backend-users.manage', 'my-special-collection.*']
        }
      }
      
      expect(canSeeInUI(user, 'backend-users')).toBe(true)
      expect(canSeeInUI(user, 'my-special-collection')).toBe(true)
      expect(canSeeInUI(user, 'other-collection')).toBe(false)
    })
  })

  describe('integration between functions', () => {
    it('should have consistent behavior between createUIVisibilityCheck and canSeeInUI', () => {
      const testCases = [
        { user: null, expected: false },
        { user: { id: '1' }, expected: false },
        { user: { id: '1', role: { permissions: [] } }, expected: false },
        { user: { id: '1', role: { permissions: ['*'] } }, expected: true },
        { user: { id: '1', role: { permissions: ['posts.*'] } }, expected: true },
        { user: { id: '1', role: { permissions: ['posts.manage'] } }, expected: true },
        { user: { id: '1', role: { permissions: ['posts.read'] } }, expected: false },
      ]

      testCases.forEach(({ user, expected }) => {
        const visibilityCheck = createUIVisibilityCheck('posts')
        const hiddenResult = visibilityCheck({ user })
        const canSeeResult = canSeeInUI(user, 'posts')
        
        // createUIVisibilityCheck returns true to hide, false to show
        // canSeeInUI returns true to show, false to hide
        expect(hiddenResult).toBe(!expected)
        expect(canSeeResult).toBe(expected)
      })
    })
  })
})