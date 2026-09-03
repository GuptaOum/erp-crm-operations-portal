import { PrismaClient } from '@prisma/client';
import { readReplicas } from '@prisma/extension-read-replicas';
import { env } from '../config/env';

const client = new PrismaClient();

function withReplica() {
  const replica = new PrismaClient({ datasourceUrl: env.databaseReplicaUrl });
  return client.$extends(readReplicas({ replicas: [replica] })) as unknown as PrismaClient;
}

export const prisma = env.databaseReplicaUrl ? withReplica() : client;
