import type { Permission } from '../types'

export interface StructuredOption {
  label: string
  value: string
  isParent?: boolean
  indent?: number
  category?: string
  description?: string
}

/**
 * Structure permissions for hierarchical display in select
 * Groups permissions by category and creates parent-child relationships
 */
export function structurePermissions(permissions: Permission[]): StructuredOption[] {
  const structured: StructuredOption[] = []
  
  // Group permissions by category
  const grouped = permissions.reduce((acc, perm) => {
    const category = perm.category || 'Other'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(perm)
    return acc
  }, {} as Record<string, Permission[]>)

  // Order categories: Special first, then collections alphabetically, then System
  const categoryOrder = Object.keys(grouped).sort((a, b) => {
    if (a === 'Special') return -1
    if (b === 'Special') return 1
    if (a === 'System') return 1
    if (b === 'System') return -1
    return a.localeCompare(b)
  })

  // Process each category
  categoryOrder.forEach(category => {
    const categoryPerms = grouped[category]
    
    if (category === 'Special' || category === 'System') {
      // Special and System permissions are flat (no hierarchy)
      categoryPerms.forEach(perm => {
        structured.push({
          label: perm.label,
          value: perm.value,
          category,
          description: perm.description,
          isParent: false,
          indent: 0
        })
      })
    } else {
      // Collection permissions have hierarchy
      // Find the wildcard permission (parent)
      const wildcardPerm = categoryPerms.find(p => p.value.endsWith('.*'))
      const otherPerms = categoryPerms.filter(p => !p.value.endsWith('.*'))
      
      if (wildcardPerm) {
        // Add parent
        structured.push({
          label: wildcardPerm.label,
          value: wildcardPerm.value,
          category,
          description: wildcardPerm.description,
          isParent: true,
          indent: 0
        })
        
        // Add children with indentation
        // Order: manage, create, read, update, delete, others (CRUD order)
        const operationOrder = ['manage', 'create', 'read', 'update', 'delete']
        const sortedPerms = otherPerms.sort((a, b) => {
          const aOp = a.value.split('.').pop() || ''
          const bOp = b.value.split('.').pop() || ''
          const aIndex = operationOrder.indexOf(aOp)
          const bIndex = operationOrder.indexOf(bOp)
          
          if (aIndex !== -1 && bIndex !== -1) {
            return aIndex - bIndex
          }
          if (aIndex !== -1) return -1
          if (bIndex !== -1) return 1
          return aOp.localeCompare(bOp)
        })
        
        sortedPerms.forEach(perm => {
          structured.push({
            label: perm.label,
            value: perm.value,
            category,
            description: perm.description,
            isParent: false,
            indent: 1
          })
        })
      } else {
        // No wildcard, add all as flat
        otherPerms.forEach(perm => {
          structured.push({
            label: perm.label,
            value: perm.value,
            category,
            description: perm.description,
            isParent: false,
            indent: 0
          })
        })
      }
    }
  })

  return structured
}

/**
 * Get display label with visual hierarchy indicators
 */
export function getDisplayLabel(option: StructuredOption): string {
  if (option.indent === 1) {
    return `  └─ ${option.label}`
  }
  return option.label
}