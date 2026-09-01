import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/AppError';
import { verifyPassword } from '../../utils/password';
import { signToken } from '../../utils/token';
import { LoginInput } from './auth.schema';

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  if (!user || !user.isActive) {
    throw new AppError(401, 'Invalid email or password');
  }

  const passwordMatches = await verifyPassword(input.password, user.passwordHash);

  if (!passwordMatches) {
    throw new AppError(401, 'Invalid email or password');
  }

  return {
    token: signToken({ sub: user.id, email: user.email, role: user.role }),
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  };
}

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true },
  });

  if (!user) {
    throw new AppError(404, 'User not found');
  }

  return user;
}
