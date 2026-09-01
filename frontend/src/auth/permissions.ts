import { Role } from '../types';

const PERMISSIONS = {
  manageCustomers: ['ADMIN', 'SALES'],
  manageProducts: ['ADMIN', 'WAREHOUSE'],
  createChallan: ['ADMIN', 'SALES'],
  confirmChallan: ['ADMIN', 'SALES', 'WAREHOUSE'],
  cancelChallan: ['ADMIN', 'SALES'],
  downloadChallan: ['ADMIN', 'SALES', 'ACCOUNTS'],
} satisfies Record<string, Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: Role | undefined, permission: Permission) {
  if (!role) {
    return false;
  }

  return (PERMISSIONS[permission] as readonly Role[]).includes(role);
}
