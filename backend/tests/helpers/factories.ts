import { Customer, Prisma, Product, Role, User } from '@prisma/client';
import { prisma } from '../../src/lib/prisma';
import { hashPassword } from '../../src/utils/password';

export const TEST_PASSWORD = 'Portal@2026';

export const ALL_ROLES: Role[] = ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'];

const ROLE_PROFILES: Record<Role, { name: string; email: string }> = {
  ADMIN: { name: 'Anita Deshmukh', email: 'admin@test.local' },
  SALES: { name: 'Rohit Kulkarni', email: 'sales@test.local' },
  WAREHOUSE: { name: 'Sagar Pawar', email: 'warehouse@test.local' },
  ACCOUNTS: { name: 'Neha Joshi', email: 'accounts@test.local' },
};

let cachedHash: string | null = null;
let sequence = 0;

function nextSequence() {
  sequence += 1;
  return sequence;
}

export async function testPasswordHash() {
  if (!cachedHash) {
    cachedHash = await hashPassword(TEST_PASSWORD);
  }

  return cachedHash;
}

export async function createUser(
  role: Role,
  overrides: Partial<Prisma.UserCreateInput> = {},
): Promise<User> {
  const profile = ROLE_PROFILES[role];

  return prisma.user.create({
    data: {
      name: profile.name,
      email: profile.email,
      passwordHash: await testPasswordHash(),
      role,
      ...overrides,
    },
  });
}

export async function createUsers(): Promise<Record<Role, User>> {
  const entries = await Promise.all(
    ALL_ROLES.map(async (role) => [role, await createUser(role)] as const),
  );

  return Object.fromEntries(entries) as Record<Role, User>;
}

export function customerPayload(overrides: Record<string, unknown> = {}) {
  const index = nextSequence();

  return {
    name: `Mahesh Bhosale ${index}`,
    mobile: `9${String(index).padStart(9, '0')}`,
    email: `customer${index}@bhosaleelectricals.in`,
    businessName: `Bhosale Electricals ${index}`,
    gstNumber: '27AAECS1234F1Z5',
    type: 'WHOLESALE',
    addressLine: 'Shop 14, Laxmi Road',
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '411030',
    status: 'ACTIVE',
    ...overrides,
  };
}

export async function createCustomer(
  createdById: string,
  overrides: Record<string, unknown> = {},
): Promise<Customer> {
  const payload = customerPayload(overrides);

  return prisma.customer.create({
    data: {
      ...(payload as Omit<Prisma.CustomerCreateManyInput, 'createdById'>),
      createdById,
    },
  });
}

export function productPayload(overrides: Record<string, unknown> = {}) {
  const index = nextSequence();

  return {
    name: `Copper Flexible Cable ${index}`,
    sku: `CBL-${String(index).padStart(4, '0')}`,
    category: 'Cables',
    unitPrice: 1890,
    currentStock: 100,
    minStockAlert: 20,
    location: 'Rack A1',
    isActive: true,
    ...overrides,
  };
}

export async function createProduct(overrides: Record<string, unknown> = {}): Promise<Product> {
  const payload = productPayload(overrides);

  return prisma.product.create({
    data: {
      ...(payload as Omit<Prisma.ProductCreateManyInput, 'unitPrice'>),
      unitPrice: new Prisma.Decimal(payload.unitPrice as number),
    },
  });
}

export async function stockOf(productId: string) {
  const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
  return product.currentStock;
}
