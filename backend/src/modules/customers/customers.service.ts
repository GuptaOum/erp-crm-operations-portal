import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/AppError';
import { buildMeta, getPageParams } from '../../utils/pagination';
import {
  CreateCustomerInput,
  CreateNoteInput,
  ListCustomersInput,
  ListFollowUpsInput,
  UpdateCustomerInput,
} from './customers.schema';

const createdBySelect = { select: { id: true, name: true } };

function toNullable(value: string | undefined) {
  return value && value.length > 0 ? value : null;
}

async function assertMobileAvailable(mobile: string, ignoreId?: string) {
  const existing = await prisma.customer.findUnique({ where: { mobile } });

  if (existing && existing.id !== ignoreId) {
    throw new AppError(409, `A customer with mobile ${mobile} already exists`);
  }
}

export async function listCustomers(query: ListCustomersInput) {
  const { page, limit, skip } = getPageParams(query.page, query.limit);
  const where: Prisma.CustomerWhereInput = {};

  if (query.status) {
    where.status = query.status;
  }

  if (query.type) {
    where.type = query.type;
  }

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { businessName: { contains: query.search, mode: 'insensitive' } },
      { mobile: { contains: query.search } },
      { email: { contains: query.search, mode: 'insensitive' } },
      { gstNumber: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { createdBy: createdBySelect },
    }),
    prisma.customer.count({ where }),
  ]);

  return { data, meta: buildMeta(total, page, limit) };
}

function dayBounds() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

const followUpSelect = {
  id: true,
  name: true,
  businessName: true,
  mobile: true,
  status: true,
  followUpDate: true,
} satisfies Prisma.CustomerSelect;

export async function listFollowUps(query: ListFollowUpsInput) {
  const { page, limit, skip } = getPageParams(query.page, query.limit);
  const { start, end } = dayBounds();

  const base: Prisma.CustomerWhereInput = {
    status: { not: 'INACTIVE' },
    followUpDate: { not: null },
  };

  const bucketWhere: Record<Exclude<typeof query.bucket, 'all'>, Prisma.CustomerWhereInput> = {
    overdue: { ...base, followUpDate: { lt: start } },
    today: { ...base, followUpDate: { gte: start, lt: end } },
    upcoming: { ...base, followUpDate: { gte: end } },
  };

  const where = query.bucket === 'all' ? base : bucketWhere[query.bucket];

  const [data, total, overdue, today, upcoming] = await Promise.all([
    prisma.customer.findMany({
      where,
      skip,
      take: limit,
      orderBy: { followUpDate: 'asc' },
      select: followUpSelect,
    }),
    prisma.customer.count({ where }),
    prisma.customer.count({ where: bucketWhere.overdue }),
    prisma.customer.count({ where: bucketWhere.today }),
    prisma.customer.count({ where: bucketWhere.upcoming }),
  ]);

  return { data, meta: buildMeta(total, page, limit), counts: { overdue, today, upcoming } };
}

export async function getCustomer(id: string) {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      createdBy: createdBySelect,
      followUps: {
        orderBy: { createdAt: 'desc' },
        include: { createdBy: createdBySelect },
      },
      challans: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          challanNumber: true,
          status: true,
          totalQuantity: true,
          createdAt: true,
        },
      },
    },
  });

  if (!customer) {
    throw new AppError(404, 'Customer not found');
  }

  return customer;
}

export async function createCustomer(input: CreateCustomerInput, userId: string) {
  await assertMobileAvailable(input.mobile);

  return prisma.customer.create({
    data: {
      name: input.name,
      mobile: input.mobile,
      email: toNullable(input.email),
      businessName: input.businessName,
      gstNumber: toNullable(input.gstNumber),
      type: input.type,
      addressLine: input.addressLine,
      city: input.city,
      state: input.state,
      pincode: input.pincode,
      status: input.status,
      followUpDate: input.followUpDate ?? null,
      notes: toNullable(input.notes),
      createdById: userId,
    },
    include: { createdBy: createdBySelect },
  });
}

export async function updateCustomer(id: string, input: UpdateCustomerInput) {
  const existing = await prisma.customer.findUnique({ where: { id } });

  if (!existing) {
    throw new AppError(404, 'Customer not found');
  }

  if (input.mobile && input.mobile !== existing.mobile) {
    await assertMobileAvailable(input.mobile, id);
  }

  const data: Prisma.CustomerUpdateInput = {
    name: input.name,
    mobile: input.mobile,
    businessName: input.businessName,
    type: input.type,
    addressLine: input.addressLine,
    city: input.city,
    state: input.state,
    pincode: input.pincode,
    status: input.status,
    followUpDate: input.followUpDate,
  };

  if (input.email !== undefined) {
    data.email = toNullable(input.email);
  }

  if (input.gstNumber !== undefined) {
    data.gstNumber = toNullable(input.gstNumber);
  }

  if (input.notes !== undefined) {
    data.notes = toNullable(input.notes);
  }

  return prisma.customer.update({
    where: { id },
    data,
    include: { createdBy: createdBySelect },
  });
}

export async function listNotes(customerId: string) {
  await getCustomer(customerId);

  return prisma.customerNote.findMany({
    where: { customerId },
    orderBy: { createdAt: 'desc' },
    include: { createdBy: createdBySelect },
  });
}

export async function addNote(customerId: string, input: CreateNoteInput, userId: string) {
  await getCustomer(customerId);

  return prisma.$transaction(async (tx) => {
    const note = await tx.customerNote.create({
      data: {
        customerId,
        note: input.note,
        followUpDate: input.followUpDate ?? null,
        createdById: userId,
      },
      include: { createdBy: createdBySelect },
    });

    if (input.followUpDate) {
      await tx.customer.update({
        where: { id: customerId },
        data: { followUpDate: input.followUpDate },
      });
    }

    return note;
  });
}
