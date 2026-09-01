import { Role } from '../types';

const ALL_ROLES: Role[] = ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'];

const PERMISSIONS = {
  manageCustomers: ['ADMIN', 'SALES'],
  manageProducts: ['ADMIN', 'WAREHOUSE'],
  createChallan: ['ADMIN', 'SALES'],
  confirmChallan: ['ADMIN', 'SALES', 'WAREHOUSE'],
  cancelChallan: ['ADMIN', 'SALES'],
  downloadChallan: ['ADMIN', 'SALES', 'ACCOUNTS'],
  viewCustomers: ['ADMIN', 'SALES', 'ACCOUNTS'],
  viewInventory: ALL_ROLES,
  viewStockMovements: ['ADMIN', 'WAREHOUSE'],
  viewChallans: ALL_ROLES,
  viewFollowUps: ['ADMIN', 'SALES'],
  viewStockAlerts: ['ADMIN', 'WAREHOUSE'],
} satisfies Record<string, Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: Role | undefined, permission: Permission) {
  if (!role) {
    return false;
  }

  return (PERMISSIONS[permission] as readonly Role[]).includes(role);
}
