import { Prisma, Product } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/AppError';
import { buildMeta, getPageParams } from '../../utils/pagination';
import {
  AdjustStockInput,
  CreateProductInput,
  ListProductsInput,
  UpdateProductInput,
} from './products.schema';

function toProductResponse(product: Product) {
  const { imageKey, unitPrice, ...rest } = product;

  return {
    ...rest,
    unitPrice: Number(unitPrice),
  };
}

export async function listProducts(query: ListProductsInput) {
  const { page, limit, skip } = getPageParams(query.page, query.limit);
  const where: Prisma.ProductWhereInput = {};

  if (query.category) {
    where.category = query.category;
  }

  if (query.lowStock) {
    where.currentStock = { lte: prisma.product.fields.minStockAlert };
  }

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { sku: { contains: query.search, mode: 'insensitive' } },
      { category: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({ where, skip, take: limit, orderBy: { name: 'asc' } }),
    prisma.product.count({ where }),
  ]);

  return {
    data: products.map(toProductResponse),
    meta: buildMeta(total, page, limit),
  };
}

export async function listCategories() {
  const rows = await prisma.product.findMany({
    distinct: ['category'],
    select: { category: true },
    orderBy: { category: 'asc' },
  });

  return rows.map((row) => row.category);
}

export async function getProduct(id: string) {
  const product = await prisma.product.findUnique({ where: { id } });

  if (!product) {
    throw new AppError(404, 'Product not found');
  }

  return toProductResponse(product);
}

export async function createProduct(input: CreateProductInput, userId: string) {
  const product = await prisma.$transaction(async (tx) => {
    const created = await tx.product.create({
      data: {
        name: input.name,
        sku: input.sku,
        category: input.category,
        unitPrice: new Prisma.Decimal(input.unitPrice),
        currentStock: input.currentStock,
        minStockAlert: input.minStockAlert,
        location: input.location,
        isActive: input.isActive,
      },
    });

    if (input.currentStock > 0) {
      await tx.stockMovement.create({
        data: {
          productId: created.id,
          quantity: input.currentStock,
          type: 'IN',
          reason: 'Opening stock',
          referenceType: 'PRODUCT',
          referenceId: created.id,
          createdById: userId,
        },
      });
    }

    return created;
  });

  return toProductResponse(product);
}

export async function updateProduct(id: string, input: UpdateProductInput) {
  const existing = await prisma.product.findUnique({ where: { id } });

  if (!existing) {
    throw new AppError(404, 'Product not found');
  }

  const product = await prisma.product.update({
    where: { id },
    data: {
      name: input.name,
      sku: input.sku,
      category: input.category,
      unitPrice: input.unitPrice === undefined ? undefined : new Prisma.Decimal(input.unitPrice),
      minStockAlert: input.minStockAlert,
      location: input.location,
      isActive: input.isActive,
    },
  });

  return toProductResponse(product);
}

export async function adjustStock(id: string, input: AdjustStockInput, userId: string) {
  const product = await prisma.$transaction(async (tx) => {
    const existing = await tx.product.findUnique({ where: { id } });

    if (!existing) {
      throw new AppError(404, 'Product not found');
    }

    if (input.type === 'OUT') {
      const reduced = await tx.product.updateMany({
        where: { id, currentStock: { gte: input.quantity } },
        data: { currentStock: { decrement: input.quantity } },
      });

      if (reduced.count === 0) {
        throw new AppError(
          400,
          `Insufficient stock for ${existing.sku}. Available ${existing.currentStock}, requested ${input.quantity}`,
        );
      }
    } else {
      await tx.product.update({
        where: { id },
        data: { currentStock: { increment: input.quantity } },
      });
    }

    await tx.stockMovement.create({
      data: {
        productId: id,
        quantity: input.quantity,
        type: input.type,
        reason: input.reason,
        referenceType: 'MANUAL',
        createdById: userId,
      },
    });

    return tx.product.findUniqueOrThrow({ where: { id } });
  });

  return toProductResponse(product);
}

