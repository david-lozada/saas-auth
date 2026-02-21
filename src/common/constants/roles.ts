// Define roles as const object (no runtime overhead)
export const ROLES = {
  SUPERADMIN: 'superadmin',
  USER: 'user',
  ADMIN: 'admin',
  MANAGER: 'manager',
  VIEWER: 'viewer',
} as const;

// Extract type from the const
export type Role = typeof ROLES[keyof typeof ROLES];

// Helper to get all values for validation
export const ROLE_VALUES = Object.values(ROLES) as string[];