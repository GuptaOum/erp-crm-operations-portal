import { Prisma, Role } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/AppError';
import { nextChallanNumber } from '../../utils/documentNumber';
import { buildMeta, getPageParams } from '../../utils/pagination';
import { CreateChallanInput, ListChallansInput } from './challans.schema';

const challanInclude = {
  customer: {
    select: {
      id: true,
      name: true,
      businessName: true,
      mobile: true,
      gstNumber: true,
      addressLine: true,
      city: true,
      state: true,
      pincode: true,
    },
  },
  createdBy: { select: { id: true, name: true } },
  items: { orderBy: { productName: 'asc' } },
} satisfies Prisma.ChallanInclude;

export type ChallanRecord = Prisma.ChallanGetPayload<{ include: typeof challanInclude }>;

const FULL_CUSTOMER_ROLES: Role[] = ['ADMIN', 'SALES', 'ACCOUNTS'];

function toChallanResponse(challan: ChallanRecord, role: Role) {
  const { gstNumber, ...deliveryDetails } = challan.customer;

  return {
    ...challan,
    customer: FULL_CUSTOMER_ROLES.includes(role)
      ? challan.customer
      : { ...deliveryDetails, gstNumber: null },
    totalAmount: Number(challan.totalAmount),
    items: challan.items.map((item) => ({
      ...item,
      unitPrice: Number(item.unitPrice),
      lineTotal: Number(item.lineTotal),
    })),
  };
}

async function confirmWithinTransaction(
  tx: Prisma.TransactionClient,
  challanId: string,
  userId: string,
) {
  const challan = await tx.challan.findUnique({
    where: { id: challanId },
    include: { items: true },
  });

  if (!challan) {
    throw new AppError(404, 'Challan not found');
  }

  if (challan.status !== 'DRAFT') {
    throw new AppError(
      409,
      `Only draft challans can be confirmed, this one is ${challan.status.toLowerCase()}`,
    );
  }

  for (const item of challan.items) {
    const reduced = await tx.product.updateMany({
      where: { id: item.productId, currentStock: { gte: item.quantity } },
      data: { currentStock: { decrement: item.quantity } },
    });

    if (reduced.count === 0) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });

      throw new AppError(
        400,
        `Insufficient stock for ${item.productSku}. Available ${product?.currentStock ?? 0}, required ${item.quantity}`,
      );
    }

    await tx.stockMovement.create({
      data: {
        productId: item.productId,
        quantity: item.quantity,
        type: 'OUT',
        reason: `Sales challan ${challan.challanNumber}`,
        referenceType: 'CHALLAN',
        referenceId: challan.id,
        createdById: userId,
      },
    });
  }

  return tx.challan.update({
    where: { id: challanId },
    data: { status: 'CONFIRMED', confirmedAt: new Date() },
    include: challanInclude,
  });
}

export async function listChallans(query: ListChallansInput, role: Role) {
  const { page, limit, skip } = getPageParams(query.page, query.limit);
  const where: Prisma.ChallanWhereInput = {};

  if (query.status) {
    where.status = query.status;
  }

  if (query.customerId) {
    where.customerId = query.customerId;
  }

  if (query.search) {
    where.OR = [
      { challanNumber: { contains: query.search, mode: 'insensitive' } },
      { customer: { name: { contains: query.search, mode: 'insensitive' } } },
      { customer: { businessName: { contains: query.search, mode: 'insensitive' } } },
    ];
  }

  const [challans, total] = await Promise.all([
    prisma.challan.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: challanInclude,
    }),
    prisma.challan.count({ where }),
  ]);

  return {
    data: challans.map((challan) => toChallanResponse(challan, role)),
    meta: buildMeta(total, page, limit),
  };
}

export async function getChallanRecord(id: string): Promise<ChallanRecord> {
  const challan = await prisma.challan.findUnique({ where: { id }, include: challanInclude });

  if (!challan) {
    throw new AppError(404, 'Challan not found');
  }

  return challan;
}

export async function getChallan(id: string, role: Role) {
  return toChallanResponse(await getChallanRecord(id), role);
}

export async function createChallan(
  input: CreateChallanInput,
  userId: string,
  role: Role,
) {
  const challan = await prisma.$transaction(async (tx) => {
    const customer = await tx.customer.findUnique({ where: { id: input.customerId } });

    if (!customer) {
      throw new AppError(404, 'Customer not found');
    }

    const quantityByProduct = new Map<string, number>();

    for (const item of input.items) {
      quantityByProduct.set(
        item.productId,
        (quantityByProduct.get(item.productId) ?? 0) + item.quantity,
      );
    }

    const products = await tx.product.findMany({
      where: { id: { in: [...quantityByProduct.keys()] } },
    });

    if (products.length !== quantityByProduct.size) {
      throw new AppError(404, 'One or more selected products could not be found');
    }

    const items = products.map((product) => {
      const quantity = quantityByProduct.get(product.id) ?? 0;

      return {
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        unitPrice: product.unitPrice,
        quantity,
        lineTotal: product.unitPrice.mul(quantity),
      };
    });

    const created = await tx.challan.create({
      data: {
        challanNumber: await nextChallanNumber(tx),
        customerId: input.customerId,
        notes: input.notes ?? null,
        totalQuantity: items.reduce((total, item) => total + item.quantity, 0),
        totalAmount: items.reduce((total, item) => total.add(item.lineTotal), new Prisma.Decimal(0)),
        createdById: userId,
        items: { create: items },
      },
      include: challanInclude,
    });

    if (input.confirm) {
      return confirmWithinTransaction(tx, created.id, userId);
    }

    return created;
  });

  return toChallanResponse(challan, role);
}

export async function confirmChallan(id: string, userId: string, role: Role) {
  const challan = await prisma.$transaction((tx) => confirmWithinTransaction(tx, id, userId));
  return toChallanResponse(challan, role);
}

export async function cancelChallan(id: string, userId: string, role: Role) {
  const challan = await prisma.$transaction(async (tx) => {
    const existing = await tx.challan.findUnique({ where: { id }, include: { items: true } });

    if (!existing) {
      throw new AppError(404, 'Challan not found');
    }

    if (existing.status === 'CANCELLED') {
      throw new AppError(409, 'This challan is already cancelled');
    }

    if (existing.status === 'CONFIRMED') {
      for (const item of existing.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { currentStock: { increment: item.quantity } },
        });

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            quantity: item.quantity,
            type: 'IN',
            reason: `Cancelled challan ${existing.challanNumber}`,
            referenceType: 'CHALLAN',
            referenceId: existing.id,
            createdById: userId,
          },
        });
      }
    }

    return tx.challan.update({
      where: { id },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
      include: challanInclude,
    });
  });

  return toChallanResponse(challan, role);
}
