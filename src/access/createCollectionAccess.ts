import type { CollectionConfig } from 'payload'
import { createAccessWrapper } from './createAccessWrapper'

/**
 * Creates wrapped access control for a collection
 * Preserves any custom access functions while adding permission checks
 */
export const createCollectionAccess = (collection: CollectionConfig) => {
  const wrappedAccess: Record<string, unknown> = {
    // Wrap CRUD operations
    read: createAccessWrapper(collection.slug, 'read', collection.access?.read),
    create: createAccessWrapper(collection.slug, 'create', collection.access?.create),
    update: createAccessWrapper(collection.slug, 'update', collection.access?.update),
    delete: createAccessWrapper(collection.slug, 'delete', collection.access?.delete),
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