/**
 * Format slug or namespace to readable label
 * Examples:
 * - 'backend-users' → 'Backend Users'
 * - 'event-management' → 'Event Management'
 * - 'user-profiles' → 'User Profiles'
 */
export const formatLabel = (slug: string): string => {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}