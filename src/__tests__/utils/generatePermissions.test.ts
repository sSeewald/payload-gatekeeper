import { generateCollectionPermissions } from '../../utils/generatePermissions'
import { mockCollections } from '../helpers/fixtures'

describe('generatePermissions', () => {
  describe('generateCollectionPermissions', () => {
    it('should generate special wildcard permissions', () => {
      const permissions = generateCollectionPermissions([])
      
      const specialPerms = permissions.filter(p => p.category === 'Special')
      expect(specialPerms).toHaveLength(5)
      
      const superAdminPerm = specialPerms.find(p => p.value === '*')
      expect(superAdminPerm).toBeDefined()
      expect(superAdminPerm?.label).toContain('Full Access')
      
      const allReadPerm = specialPerms.find(p => p.value === '*.read')
      expect(allReadPerm).toBeDefined()
      expect(allReadPerm?.label).toContain('All Read Access')
    })

    it('should generate permissions for each collection', () => {
      const permissions = generateCollectionPermissions(mockCollections)
      
      // Check backend-users permissions
      const backendUserPerms = permissions.filter(p => p.category === 'Backend Users')
      expect(backendUserPerms.length).toBeGreaterThan(0)
      
      // Should have wildcard, CRUD, and manage permissions
      expect(backendUserPerms.find(p => p.value === 'backend-users.*')).toBeDefined()
      expect(backendUserPerms.find(p => p.value === 'backend-users.read')).toBeDefined()
      expect(backendUserPerms.find(p => p.value === 'backend-users.create')).toBeDefined()
      expect(backendUserPerms.find(p => p.value === 'backend-users.update')).toBeDefined()
      expect(backendUserPerms.find(p => p.value === 'backend-users.delete')).toBeDefined()
      expect(backendUserPerms.find(p => p.value === 'backend-users.manage')).toBeDefined()
    })



    it('should add publish permission for versioned collections', () => {
      const collectionsWithVersions = [
        {
          slug: 'pages',
          fields: [],
          versions: {
            drafts: true,
          },
        },
      ]
      
      const permissions = generateCollectionPermissions(collectionsWithVersions as any)
      
      const publishPerm = permissions.find(p => p.value === 'pages.publish')
      expect(publishPerm).toBeDefined()
      expect(publishPerm?.description).toContain('Publish')
    })



    it('should format collection slugs to readable labels', () => {
      const testCollections = [
        { slug: 'backend-users', fields: [] },
        { slug: 'user-profiles', fields: [] },
        { slug: 'posts', fields: [] },
      ]
      
      const permissions = generateCollectionPermissions(testCollections as any)
      
      const backendUsersPerms = permissions.filter(p => p.category === 'Backend Users')
      expect(backendUsersPerms.length).toBeGreaterThan(0)
      
      const userProfilesPerms = permissions.filter(p => p.category === 'User Profiles')
      expect(userProfilesPerms.length).toBeGreaterThan(0)
      
      const postsPerms = permissions.filter(p => p.category === 'Posts')
      expect(postsPerms.length).toBeGreaterThan(0)
    })

    it('should include description for each permission', () => {
      const permissions = generateCollectionPermissions(mockCollections)
      
      permissions.forEach(permission => {
        expect(permission.description).toBeDefined()
        expect(permission.description).not.toBe('')
      })
    })

    it('should handle empty collections array', () => {
      const permissions = generateCollectionPermissions([])
      
      // Should still have special permissions
      expect(permissions.length).toBeGreaterThan(0)
      expect(permissions.find(p => p.category === 'Special')).toBeDefined()
    })
    
    it('should include custom permissions when provided', () => {
      const customPermissions = [
        {
          label: 'Export Events',
          value: 'event-management.export',
          description: 'Export event data'
        },
        {
          label: 'Manage Templates', 
          value: 'event-management.templates',
          description: 'Manage event templates'
        },
        {
          label: 'Send Newsletters',
          value: 'marketing.newsletters',
          description: 'Send marketing emails'
        }
      ]
      
      const permissions = generateCollectionPermissions([], customPermissions)
      
      // Should include custom permissions with correct categories extracted from namespace
      const eventPerms = permissions.filter(p => p.category === 'Event Management')
      expect(eventPerms).toHaveLength(2)  // Two permissions in Event Management category
      expect(eventPerms.find(p => p.value === 'event-management.export')).toBeDefined()
      expect(eventPerms.find(p => p.value === 'event-management.templates')).toBeDefined()
      
      const marketingPerms = permissions.filter(p => p.category === 'Marketing')
      expect(marketingPerms).toHaveLength(1)
      expect(marketingPerms[0].value).toBe('marketing.newsletters')
    })
    
    it('should handle custom permissions without namespace', () => {
      const customPermissions = [
        {
          label: 'Special Operation',
          value: 'special',  // No dot, no namespace
          description: 'A special operation'
        }
      ]
      
      const permissions = generateCollectionPermissions([], customPermissions)
      
      const specialPerm = permissions.find(p => p.value === 'special')
      expect(specialPerm).toBeDefined()
      // Category should be "Special" (formatted from single word)
      expect(specialPerm?.category).toBe('Special')
    })
  })
})