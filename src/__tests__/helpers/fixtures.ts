import type { CollectionConfig } from 'payload'
import type { RoleDocument, GatekeeperOptions } from '../../types'

export const mockCollections: CollectionConfig[] = [
  {
    slug: 'backend-users',
    auth: true,
    fields: [
      {
        name: 'email',
        type: 'email',
        required: true,
      },
    ],
  },
  {
    slug: 'users',
    auth: true,
    fields: [
      {
        name: 'email',
        type: 'email',
        required: true,
      },
    ],
  },
  {
    slug: 'posts',
    fields: [
      {
        name: 'title',
        type: 'text',
        required: true,
      },
    ],
  },
  {
    slug: 'media',
    upload: true,
    fields: [],
  },
]

export const mockRoles: RoleDocument[] = [
  {
    id: '1',
    name: 'super_admin',
    label: 'Super Administrator',
    permissions: ['*'],
    active: true,
    protected: true,
    systemManaged: true,
  },
  {
    id: '2',
    name: 'admin',
    label: 'Administrator',
    permissions: [
      'backend-users.*',
      'users.*',
      'posts.*',
      'media.*',
    ],
    active: true,
    protected: false,
    systemManaged: true,
    visibleFor: ['backend-users'],
  },
  {
    id: '3',
    name: 'editor',
    label: 'Editor',
    permissions: [
      'posts.read',
      'posts.create',
      'posts.update',
      'media.read',
      'media.create',
    ],
    active: true,
    protected: false,
    systemManaged: false,
  },
  {
    id: '4',
    name: 'viewer',
    label: 'Viewer',
    permissions: [
      'posts.read',
      'media.read',
    ],
    active: true,
    protected: false,
    systemManaged: false,
  },
]

export const mockPluginOptions: GatekeeperOptions = {
  collections: {
    'backend-users': {
      enhance: true,
      autoAssignFirstUser: true,
      roleFieldPlacement: {
        tab: 'User',
        position: 'first',
      },
    },
    'users': {
      enhance: true,
      autoAssignFirstUser: false,
      defaultRole: 'viewer',
      roleFieldPlacement: {
        position: 'sidebar',
      },
    },
  },
  systemRoles: [
    {
      name: 'admin',
      label: 'Administrator',
      permissions: ['backend-users.*', 'users.*', 'posts.*', 'media.*'],
      active: true,
      description: 'Full admin access',
      visibleFor: ['backend-users'],
    },
  ],
  rolesSlug: 'roles',
  rolesGroup: 'System',
  seedingMode: false,
  syncRolesOnInit: true,
}

export const generateTestPermissions = () => [
  { label: 'Full Access', value: '*', category: 'Special' },
  { label: 'All Read Access', value: '*.read', category: 'Special' },
  { label: 'Backend Users - Read', value: 'backend-users.read', category: 'Backend Users' },
  { label: 'Backend Users - Create', value: 'backend-users.create', category: 'Backend Users' },
  { label: 'Backend Users - Update', value: 'backend-users.update', category: 'Backend Users' },
  { label: 'Backend Users - Delete', value: 'backend-users.delete', category: 'Backend Users' },
  { label: 'Posts - Read', value: 'posts.read', category: 'Posts' },
  { label: 'Posts - Create', value: 'posts.create', category: 'Posts' },
  { label: 'Posts - Update', value: 'posts.update', category: 'Posts' },
  { label: 'Posts - Delete', value: 'posts.delete', category: 'Posts' },
]
