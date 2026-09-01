import { PrismaClient, Role } from '@prisma/client';
import { hashPassword } from './utils/password';
import { createChallan } from './modules/challans/challans.service';

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = 'Portal@2026';

const users = [
  { name: 'Anita Deshmukh', email: 'admin@example.com', role: Role.ADMIN },
  { name: 'Rohit Kulkarni', email: 'sales@example.com', role: Role.SALES },
  { name: 'Sagar Pawar', email: 'warehouse@example.com', role: Role.WAREHOUSE },
  { name: 'Neha Joshi', email: 'accounts@example.com', role: Role.ACCOUNTS },
];

const customers = [
  {
    name: 'Mahesh Bhosale',
    mobile: '9822014455',
    email: 'mahesh@bhosaleelectricals.in',
    businessName: 'Bhosale Electricals',
    gstNumber: '27AAECS1234F1Z5',
    type: 'WHOLESALE' as const,
    addressLine: 'Shop 14, Laxmi Road',
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '411030',
    status: 'ACTIVE' as const,
  },
  {
    name: 'Sunil Kadam',
    mobile: '9730112288',
    email: 'sunil@kadamtraders.in',
    businessName: 'Kadam Traders',
    gstNumber: '27AAFCK5678H1Z2',
    type: 'DISTRIBUTOR' as const,
    addressLine: 'Gala 7, MIDC Bhosari',
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '411026',
    status: 'ACTIVE' as const,
  },
  {
    name: 'Priya Shah',
    mobile: '9860445577',
    email: 'priya@shahhardware.co.in',
    businessName: 'Shah Hardware Mart',
    gstNumber: '27AAGCS9012J1Z8',
    type: 'RETAIL' as const,
    addressLine: '22 Fergusson College Road',
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '411004',
    status: 'ACTIVE' as const,
  },
  {
    name: 'Imran Shaikh',
    mobile: '9145778899',
    email: 'imran@shaikhelectric.in',
    businessName: 'Shaikh Electric Stores',
    gstNumber: '27AAHCS3456K1Z1',
    type: 'RETAIL' as const,
    addressLine: 'Plot 9, Camp Area',
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '411001',
    status: 'LEAD' as const,
  },
  {
    name: 'Vikram Patil',
    mobile: '9028334466',
    email: 'vikram@patildistributors.in',
    businessName: 'Patil Distributors',
    gstNumber: '27AAICP7890L1Z4',
    type: 'DISTRIBUTOR' as const,
    addressLine: 'Warehouse 3, Chakan MIDC',
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '410501',
    status: 'ACTIVE' as const,
  },
  {
    name: 'Sneha Kulkarni',
    mobile: '9975221133',
    email: 'sneha@kulkarnisupplies.in',
    businessName: 'Kulkarni Supplies',
    gstNumber: '27AAJCK2345M1Z7',
    type: 'WHOLESALE' as const,
    addressLine: '5 Shivaji Nagar Market',
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '411005',
    status: 'ACTIVE' as const,
  },
  {
    name: 'Ganesh More',
    mobile: '9764887722',
    email: null,
    businessName: 'More Electricals',
    gstNumber: null,
    type: 'RETAIL' as const,
    addressLine: 'Lane 4, Kothrud',
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '411038',
    status: 'LEAD' as const,
  },
  {
    name: 'Rajesh Agarwal',
    mobile: '9890556644',
    email: 'rajesh@agarwalcables.in',
    businessName: 'Agarwal Cables',
    gstNumber: '27AAKCA6789N1Z3',
    type: 'WHOLESALE' as const,
    addressLine: 'Unit 11, Hadapsar Industrial Estate',
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '411013',
    status: 'ACTIVE' as const,
  },
  {
    name: 'Farhan Qureshi',
    mobile: '9922665511',
    email: 'farhan@qureshihardware.in',
    businessName: 'Qureshi Hardware',
    gstNumber: '27AALCQ1122P1Z9',
    type: 'RETAIL' as const,
    addressLine: '18 Nana Peth',
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '411002',
    status: 'INACTIVE' as const,
  },
  {
    name: 'Deepak Jadhav',
    mobile: '9673449988',
    email: 'deepak@jadhavtrading.in',
    businessName: 'Jadhav Trading Company',
    gstNumber: '27AAMCJ3344Q1Z6',
    type: 'DISTRIBUTOR' as const,
    addressLine: 'Godown 2, Wagholi',
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '412207',
    status: 'ACTIVE' as const,
  },
  {
    name: 'Kavita Rane',
    mobile: '9821337744',
    email: 'kavita@raneenterprises.in',
    businessName: 'Rane Enterprises',
    gstNumber: '27AANCR5566R1Z0',
    type: 'WHOLESALE' as const,
    addressLine: 'Office 6, Baner Road',
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '411045',
    status: 'LEAD' as const,
  },
  {
    name: 'Nitin Chavan',
    mobile: '9096442255',
    email: 'nitin@chavanelectricals.in',
    businessName: 'Chavan Electricals',
    gstNumber: '27AAOCC7788S1Z2',
    type: 'RETAIL' as const,
    addressLine: 'Shop 3, Pimpri Market',
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '411017',
    status: 'ACTIVE' as const,
  },
];

const products = [
  { name: 'Copper Flexible Cable 1.5 sqmm', sku: 'CBL-1508', category: 'Cables', unitPrice: 1890, currentStock: 240, minStockAlert: 60, location: 'Rack A1' },
  { name: 'Copper Flexible Cable 2.5 sqmm', sku: 'CBL-2508', category: 'Cables', unitPrice: 2940, currentStock: 180, minStockAlert: 50, location: 'Rack A1' },
  { name: 'Copper Flexible Cable 4 sqmm', sku: 'CBL-4008', category: 'Cables', unitPrice: 4620, currentStock: 42, minStockAlert: 50, location: 'Rack A2' },
  { name: 'Armoured Cable 4 Core 6 sqmm', sku: 'CBL-AR46', category: 'Cables', unitPrice: 8750, currentStock: 26, minStockAlert: 20, location: 'Rack A3' },
  { name: 'MCB Single Pole 16A', sku: 'SWG-MCB16', category: 'Switchgear', unitPrice: 245, currentStock: 620, minStockAlert: 150, location: 'Rack B1' },
  { name: 'MCB Double Pole 32A', sku: 'SWG-MCB32', category: 'Switchgear', unitPrice: 685, currentStock: 310, minStockAlert: 100, location: 'Rack B1' },
  { name: 'RCCB Four Pole 63A 30mA', sku: 'SWG-RCCB63', category: 'Switchgear', unitPrice: 3450, currentStock: 48, minStockAlert: 25, location: 'Rack B2' },
  { name: 'Distribution Board 8 Way', sku: 'SWG-DB08', category: 'Switchgear', unitPrice: 1560, currentStock: 74, minStockAlert: 30, location: 'Rack B3' },
  { name: 'Changeover Switch 63A', sku: 'SWG-CO63', category: 'Switchgear', unitPrice: 2280, currentStock: 18, minStockAlert: 20, location: 'Rack B3' },
  { name: 'LED Panel Light 18W Round', sku: 'LGT-P18R', category: 'Lighting', unitPrice: 420, currentStock: 540, minStockAlert: 120, location: 'Rack C1' },
  { name: 'LED Batten 20W', sku: 'LGT-BT20', category: 'Lighting', unitPrice: 385, currentStock: 460, minStockAlert: 120, location: 'Rack C1' },
  { name: 'LED Flood Light 100W', sku: 'LGT-FL100', category: 'Lighting', unitPrice: 1740, currentStock: 88, minStockAlert: 40, location: 'Rack C2' },
  { name: 'Street Light 60W IP66', sku: 'LGT-SL60', category: 'Lighting', unitPrice: 2650, currentStock: 22, minStockAlert: 30, location: 'Rack C3' },
  { name: 'PVC Conduit Pipe 25mm', sku: 'PIP-PVC25', category: 'Pipes', unitPrice: 165, currentStock: 980, minStockAlert: 200, location: 'Rack D1' },
  { name: 'PVC Conduit Pipe 32mm', sku: 'PIP-PVC32', category: 'Pipes', unitPrice: 235, currentStock: 640, minStockAlert: 200, location: 'Rack D1' },
  { name: 'Flexible Conduit 20mm', sku: 'PIP-FLX20', category: 'Pipes', unitPrice: 118, currentStock: 150, minStockAlert: 180, location: 'Rack D2' },
  { name: 'Cable Gland Brass 20mm', sku: 'FST-CG20', category: 'Fasteners', unitPrice: 46, currentStock: 1450, minStockAlert: 300, location: 'Bin E1' },
  { name: 'Cable Tie 200mm Pack of 100', sku: 'FST-CT200', category: 'Fasteners', unitPrice: 92, currentStock: 720, minStockAlert: 200, location: 'Bin E2' },
  { name: 'Insulation Tape Pack of 10', sku: 'FST-IT10', category: 'Fasteners', unitPrice: 135, currentStock: 380, minStockAlert: 150, location: 'Bin E2' },
  { name: 'Digital Multimeter', sku: 'TLS-DMM01', category: 'Tools', unitPrice: 1250, currentStock: 34, minStockAlert: 15, location: 'Rack F1' },
  { name: 'Wire Stripping Plier 6 inch', sku: 'TLS-WSP06', category: 'Tools', unitPrice: 465, currentStock: 96, minStockAlert: 40, location: 'Rack F1' },
  { name: 'Crimping Tool Ratchet Type', sku: 'TLS-CRT01', category: 'Tools', unitPrice: 1980, currentStock: 12, minStockAlert: 20, location: 'Rack F2' },
];

async function seedUsers() {
  const passwordHash = await hashPassword(DEFAULT_PASSWORD);

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      create: { ...user, passwordHash },
      update: { name: user.name, role: user.role, isActive: true },
    });
  }

  return prisma.user.findMany();
}

async function seedCustomers(createdById: string) {
  const followUp = new Date();
  followUp.setDate(followUp.getDate() + 3);

  for (const [index, customer] of customers.entries()) {
    const existing = await prisma.customer.findFirst({ where: { mobile: customer.mobile } });

    if (existing) {
      continue;
    }

    await prisma.customer.create({
      data: {
        ...customer,
        followUpDate: index % 4 === 0 ? followUp : null,
        notes: customer.status === 'LEAD' ? 'Enquiry received, quotation to be shared.' : null,
        createdById,
      },
    });
  }
}

async function seedProducts(createdById: string) {
  for (const product of products) {
    const existing = await prisma.product.findUnique({ where: { sku: product.sku } });

    if (existing) {
      continue;
    }

    const created = await prisma.product.create({ data: product });

    await prisma.stockMovement.create({
      data: {
        productId: created.id,
        quantity: product.currentStock,
        type: 'IN',
        reason: 'Opening stock',
        referenceType: 'PRODUCT',
        referenceId: created.id,
        createdById,
      },
    });
  }
}

async function seedChallans(salesUserId: string) {
  if ((await prisma.challan.count()) > 0) {
    return;
  }

  const [bhosale, kadam, patil] = await Promise.all([
    prisma.customer.findFirstOrThrow({ where: { businessName: 'Bhosale Electricals' } }),
    prisma.customer.findFirstOrThrow({ where: { businessName: 'Kadam Traders' } }),
    prisma.customer.findFirstOrThrow({ where: { businessName: 'Patil Distributors' } }),
  ]);

  const [cable15, mcb16, panel18, batten20, conduit25] = await Promise.all([
    prisma.product.findUniqueOrThrow({ where: { sku: 'CBL-1508' } }),
    prisma.product.findUniqueOrThrow({ where: { sku: 'SWG-MCB16' } }),
    prisma.product.findUniqueOrThrow({ where: { sku: 'LGT-P18R' } }),
    prisma.product.findUniqueOrThrow({ where: { sku: 'LGT-BT20' } }),
    prisma.product.findUniqueOrThrow({ where: { sku: 'PIP-PVC25' } }),
  ]);

  await createChallan(
    {
      customerId: bhosale.id,
      confirm: true,
      notes: 'Delivered by company vehicle MH12 AB 4471.',
      items: [
        { productId: cable15.id, quantity: 20 },
        { productId: mcb16.id, quantity: 50 },
      ],
    },
    salesUserId,
  );

  await createChallan(
    {
      customerId: kadam.id,
      confirm: true,
      items: [
        { productId: panel18.id, quantity: 60 },
        { productId: batten20.id, quantity: 40 },
        { productId: conduit25.id, quantity: 100 },
      ],
    },
    salesUserId,
  );

  await createChallan(
    {
      customerId: patil.id,
      confirm: false,
      notes: 'Awaiting confirmation on delivery date.',
      items: [{ productId: cable15.id, quantity: 15 }],
    },
    salesUserId,
  );
}

async function main() {
  const seededUsers = await seedUsers();

  const admin = seededUsers.find((user) => user.role === Role.ADMIN);
  const sales = seededUsers.find((user) => user.role === Role.SALES);
  const warehouse = seededUsers.find((user) => user.role === Role.WAREHOUSE);

  if (!admin || !sales || !warehouse) {
    throw new Error('Seed users were not created correctly');
  }

  await seedCustomers(sales.id);
  await seedProducts(warehouse.id);
  await seedChallans(sales.id);

  console.log('Seed completed');
  console.log(`All accounts use the password ${DEFAULT_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
