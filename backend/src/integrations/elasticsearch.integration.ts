import { Client } from '@elastic/elasticsearch';
import { env } from '../config/env';
import { logger } from '../config/logger';

export const EMAIL_INDEX = 'emails';

export interface EmailSearchDoc {
  id: string;
  userId: string;
  sender: string;
  recipient: string;
  subject: string;
  body: string;
  status: string;
  scheduledAt: string;
  sentAt: string | null;
}

export interface EmailSearchHit extends EmailSearchDoc {
  highlight?: Record<string, string[]>;
}

export interface EmailSearchResult {
  items: EmailSearchHit[];
  total: number;
  page: number;
  pageSize: number;
}

export const esClient = env.elasticsearchUrl
  ? new Client({
      node: env.elasticsearchUrl,
      requestTimeout: 5000,
      maxRetries: 1,
    })
  : null;

let indexReady = false;

async function ensureIndex(): Promise<void> {
  if (!esClient) {
    throw new Error(
      'Elasticsearch is not configured. Set ELASTICSEARCH_URL.',
    );
  }

  if (indexReady) return;

  const exists = await esClient.indices.exists({
    index: EMAIL_INDEX,
  });

  if (!exists) {
    await esClient.indices.create({
      index: EMAIL_INDEX,
      mappings: {
        properties: {
          id: { type: 'keyword' },
          userId: { type: 'keyword' },
          sender: { type: 'text' },
          recipient: { type: 'text' },
          subject: { type: 'text' },
          body: { type: 'text' },
          status: { type: 'keyword' },
          scheduledAt: { type: 'date' },
          sentAt: { type: 'date' },
        },
      },
    });

    logger.info(
      { index: EMAIL_INDEX },
      'Elasticsearch index created',
    );
  }

  indexReady = true;
}

export async function indexEmailSafe(
  doc: EmailSearchDoc,
): Promise<void> {
  if (!esClient) {
    logger.debug(
      'Elasticsearch not configured; skipping email indexing',
    );
    return;
  }

  try {
    await ensureIndex();

    await esClient.index({
      index: EMAIL_INDEX,
      id: doc.id,
      document: doc,
    });
  } catch (err) {
    indexReady = false;

    logger.warn(
      {
        err: (err as Error).message,
        emailId: doc.id,
      },
      'Elasticsearch indexing failed (non-fatal)',
    );
  }
}

export async function bulkIndex(
  docs: EmailSearchDoc[],
): Promise<void> {
  if (docs.length === 0 || !esClient) {
    return;
  }

  await ensureIndex();

  const operations = docs.flatMap((doc) => [
    {
      index: {
        _index: EMAIL_INDEX,
        _id: doc.id,
      },
    },
    doc,
  ]);

  const res = await esClient.bulk({
    operations,
    refresh: true,
  });

  if (res.errors) {
    throw new Error(
      'Elasticsearch bulk indexing reported item errors',
    );
  }
}

export interface SearchParams {
  userId: string;
  q?: string;
  status?: string;
  page: number;
  pageSize: number;
}

export async function searchEmails(
  params: SearchParams,
): Promise<EmailSearchResult> {
  if (!esClient) {
    throw new Error(
      'Elasticsearch is not configured. Set ELASTICSEARCH_URL.',
    );
  }

  await ensureIndex();

  const filter: object[] = [
    {
      term: {
        userId: params.userId,
      },
    },
  ];

  if (params.status) {
    filter.push({
      term: {
        status: params.status,
      },
    });
  }

  const must: object[] = params.q
    ? [
        {
          multi_match: {
            query: params.q,
            fields: [
              'recipient^3',
              'subject^2',
              'sender',
              'body',
            ],
            operator: 'and',
          },
        },
      ]
    : [
        {
          match_all: {},
        },
      ];

  const res = await esClient.search<EmailSearchDoc>({
    index: EMAIL_INDEX,
    from: (params.page - 1) * params.pageSize,
    size: params.pageSize,

    query: {
      bool: {
        must,
        filter,
      },
    },

    sort: params.q
      ? undefined
      : [
          {
            scheduledAt: {
              order: 'desc',
            },
          },
        ],

    highlight: {
      encoder: 'html',
      pre_tags: ['<mark>'],
      post_tags: ['</mark>'],
      fields: {
        recipient: {},
        subject: {},
        sender: {},
        body: {
          fragment_size: 120,
          number_of_fragments: 1,
        },
      },
    },
  });

  const total =
    typeof res.hits.total === 'number'
      ? res.hits.total
      : res.hits.total?.value ?? 0;

  const items: EmailSearchHit[] =
    res.hits.hits.map((hit) => ({
      ...(hit._source as EmailSearchDoc),
      highlight: hit.highlight,
    }));

  return {
    items,
    total,
    page: params.page,
    pageSize: params.pageSize,
  };
}