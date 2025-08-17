/**
 * Get the configured roles collection slug
 * This is stored globally to avoid passing it through every function
 */

let configuredRolesSlug = 'roles'

export const setRolesSlug = (slug: string) => {
  configuredRolesSlug = slug
}

export const getRolesSlug = () => configuredRolesSlug