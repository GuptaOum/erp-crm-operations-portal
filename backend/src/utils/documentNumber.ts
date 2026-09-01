import { Prisma } from '@prisma/client';

export async function nextChallanNumber(tx: Prisma.TransactionClient): Promise<string> {
  const year = new Date().getFullYear();

  const sequence = await tx.documentSequence.upsert({
    where: { docType_year: { docType: 'CHALLAN', year } },
    create: { docType: 'CHALLAN', year, lastNumber: 1 },
    update: { lastNumber: { increment: 1 } },
  });

  return `CH-${year}-${String(sequence.lastNumber).padStart(4, '0')}`;
}
