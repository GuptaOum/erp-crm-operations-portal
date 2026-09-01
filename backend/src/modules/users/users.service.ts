import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/AppError';
import { buildMeta, getPageParams } from '../../utils/pagination';
import { hashPassword } from '../../utils/password';
import { CreateUserInput, ListUsersInput, UpdateUserInput } from './users.schema';

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export async function listUsers(query: ListUsersInput) {
  const { page, limit, skip } = getPageParams(query.page, query.limit);
  const where: Prisma.UserWhereInput = {};

  if (query.role) {
    where.role = query.role;
  }

  if (query.isActive !== undefined) {
    where.isActive = query.isActive;
  }

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { email: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      select: userSelect,
    }),
    prisma.user.count({ where }),
  ]);

  return { data, meta: buildMeta(total, page, limit) };
}

export async function createUser(input: CreateUserInput) {
  return prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      role: input.role,
      passwordHash: await hashPassword(input.password),
    },
    select: userSelect,
  });
}

export async function updateUser(id: string, input: UpdateUserInput, actorId: string) {
  const existing = await prisma.user.findUnique({ where: { id } });

  if (!existing) {
    throw new AppError(404, 'User not found');
  }

  if (id === actorId) {
    if (input.isActive === false) {
      throw new AppError(400, 'You cannot deactivate your own account');
    }

    if (input.role && input.role !== existing.role) {
      throw new AppError(400, 'You cannot change your own role');
    }
  }

  return prisma.user.update({
    where: { id },
    data: { name: input.name, role: input.role, isActive: input.isActive },
    select: userSelect,
  });
}

export async function resetPassword(id: string, password: string) {
  const existing = await prisma.user.findUnique({ where: { id } });

  if (!existing) {
    throw new AppError(404, 'User not found');
  }

  return prisma.user.update({
    where: { id },
    data: { passwordHash: await hashPassword(password) },
    select: userSelect,
  });
}
