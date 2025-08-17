import type { CollectionConfig } from 'payload'
import { CRUD_OPERATIONS, PERMISSIONS } from '../constants'
import type { Permission } from '../types'
import { formatLabel } from './formatLabel'

// Pre-defined special permissions for better performance
const SPECIAL_PERMISSIONS: Permission[] = [
  {
    label: '⭐ Full Access (Super Admin)',
    value: PERMISSIONS.ALL,
    category: 'Special',
    description: 'Complete system access'
  },
  {
    label: '📖 All Read Access',
    value: PERMISSIONS.ALL_READ,
    category: 'Special',
    description: 'Read access to all collections'
  },
  {
    label: '✏️ All Create Access',
    value: PERMISSIONS.ALL_CREATE,
    category: 'Special',
    description: 'Create access to all collections'
  },
  {
    label: '📝 All Update Access',
    value: PERMISSIONS.ALL_UPDATE,
    category: 'Special',
    description: 'Update access to all collections'
  },
  {
    label: '🗑️ All Delete Access',
    value: PERMISSIONS.ALL_DELETE,
    category: 'Special',
    description: 'Delete access to all collections'
  }
]



/**
 * Generate permissions for all collections dynamically
 * Optimized with functional programming and pre-computed constants
 */
export const generateCollectionPermissions = (
  collections: CollectionConfig[],
  customPermissions?: Array<{
    label: string
    value: string
    description?: string
  }>
): Permission[] => {
  // Use flatMap for more efficient array building
  const collectionPermissions = collections.flatMap(collection => {
    const collectionLabel = formatLabel(collection.slug)
    
    // Build all permissions for this collection in one array
    const basePermissions: Permission[] = [
      // Collection wildcard
      {
        label: `All ${collectionLabel} Operations`,
        value: `${collection.slug}.*`,
        category: collectionLabel,
        description: `All operations for ${collectionLabel}`
      },
      // CRUD permissions using map
      ...CRUD_OPERATIONS.map(operation => ({
        label: `${getOperationLabel(operation)} ${collectionLabel}`,
        value: `${collection.slug}.${operation}`,
        category: collectionLabel,
        description: `${operation} permission for ${collectionLabel}`
      })),
      // Manage permission
      {
        label: `Manage ${collectionLabel}`,
        value: `${collection.slug}.manage`,
        category: collectionLabel,
        description: `Full management of ${collectionLabel}`
      }
    ]

    // Add conditional permissions inline
    if (collection.versions) {
      basePermissions.push({
        label: `Publish ${collectionLabel}`,
        value: `${collection.slug}.publish`,
        category: collectionLabel,
        description: `Publish ${collectionLabel} versions`
      })
    }



    return basePermissions
  })

  // Process custom permissions - extract and format namespace as category
  const processedCustomPermissions: Permission[] = customPermissions?.map(perm => {
    // Extract namespace from value (part before the dot)
    const namespace = perm.value.split('.')[0]
    const formattedCategory = namespace ? formatLabel(namespace) : undefined
    
    return {
      ...perm,
      category: formattedCategory
    }
  }) || []

  // Combine all permissions in a single return
  return [
    ...SPECIAL_PERMISSIONS,
    ...collectionPermissions,
    ...processedCustomPermissions
  ]
}



/**
 * Get operation label
 */
const getOperationLabel = (operation: string): string => {
  const labels: Record<string, string> = {
    create: 'Create',
    read: 'Read',
    update: 'Edit',
    delete: 'Delete',
  }
  return labels[operation] || operation
}
