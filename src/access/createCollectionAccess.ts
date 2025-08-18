import type { CollectionConfig, Access } from 'payload'
import type { GatekeeperOptions } from '../types'
import { createAccessWrapper } from './createAccessWrapper'

/**
 * Creates wrapped access control for a collection
 * Preserves any custom access functions while adding permission checks
 * Auth collections are protected from public access
 */
export const createCollectionAccess = (collection: CollectionConfig, options?: GatekeeperOptions) => {
  // Special handling for auth collections - never allow public access
  const readAccess: Access = collection.auth 
    ? async (args) => {
        // Auth collections: no public access
        if (!args.req.user) return false
        
        // Use standard wrapper for authenticated users
        return createAccessWrapper(collection.slug, 'read', collection.access?.read, options)(args)
      }
    : createAccessWrapper(collection.slug, 'read', collection.access?.read, options)

  const wrappedAccess: Record<string, unknown> = {
    // Wrap CRUD operations
    read: readAccess,
    create: createAccessWrapper(collection.slug, 'create', collection.access?.create, options),
    update: createAccessWrapper(collection.slug, 'update', collection.access?.update, options),
    delete: createAccessWrapper(collection.slug, 'delete', collection.access?.delete, options),
  }

  // Preserve any other access control functions that might exist
  if (collection.access) {
    Object.keys(collection.access).forEach(key => {
      if (!['read', 'create', 'update', 'delete'].includes(key)) {
        wrappedAccess[key] = collection.access?.[key as keyof typeof collection.access]
      }
    })
  }

  return wrappedAccess
}