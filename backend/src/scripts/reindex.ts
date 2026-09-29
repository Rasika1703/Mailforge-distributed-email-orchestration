import { prisma } from '../config/prisma';
import { logger } from '../config/logger';
import { bulkIndex } from '../integrations/elasticsearch.integration';
import { toSearchDoc } from '../services/search.service';

const PAGE_SIZE = 1000;
async function main(): Promise<void> {
  let cursor = '';
  let total = 0;

  for (;;) {
    const rows = await prisma.email.findMany({
      where: { id: { gt: cursor } },
      orderBy: { id: 'asc' },
      take: PAGE_SIZE,
      include: { sender: { select: { email: true } } },
    });
    if (rows.length === 0) break;

    await bulkIndex(rows.map((row) => toSearchDoc(row, row.sender.email)));
    total += rows.length;
    cursor = rows[rows.length - 1].id;
    logger.info({ total }, 'Reindex progress');
  }

  logger.info({ total }, 'Reindex complete');
  await prisma.$disconnect();
}

main().catch((err) => {
  logger.error({ err }, 'Reindex failed');
  process.exit(1);
});
