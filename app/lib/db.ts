import postgres from 'postgres';

type ClientKind = 'pooled' | 'direct';

function cleanEnvValue(value: string | undefined) {
  const cleaned = value?.trim();
  return cleaned ? cleaned : undefined;
}

const CLIENT_OPTIONS = {
  ssl: 'require' as const,
  max: 1,
  idle_timeout: 20,
  connect_timeout: 15,
  prepare: false,
  onnotice: () => undefined,
};

function getConnectionCandidates(kind: ClientKind) {
  const pooledCandidates = [
    ['POSTGRES_URL', cleanEnvValue(process.env.POSTGRES_URL)],
    ['DATABASE_URL', cleanEnvValue(process.env.DATABASE_URL)],
    ['POSTGRES_PRISMA_URL', cleanEnvValue(process.env.POSTGRES_PRISMA_URL)],
  ] as const;

  const directCandidates = [
    ['POSTGRES_URL_NON_POOLING', cleanEnvValue(process.env.POSTGRES_URL_NON_POOLING)],
    ['DATABASE_URL_UNPOOLED', cleanEnvValue(process.env.DATABASE_URL_UNPOOLED)],
    ['DATABASE_URL', cleanEnvValue(process.env.DATABASE_URL)],
    ['POSTGRES_URL', cleanEnvValue(process.env.POSTGRES_URL)],
  ] as const;

  return kind === 'direct' ? directCandidates : pooledCandidates;
}

function getConnectionString(kind: ClientKind) {
  const connectionString = getConnectionCandidates(kind).find(([, value]) => value)?.[1];

  if (!connectionString) {
    const fallbackConnectionString = getConnectionCandidates(kind === 'direct' ? 'pooled' : 'direct').find(
      ([, value]) => value,
    )?.[1];

    if (!fallbackConnectionString) {
      throw new Error(
        'Database connection string is missing. Set POSTGRES_URL or DATABASE_URL in your environment.',
      );
    }

    return fallbackConnectionString;
  }

  return connectionString;
}

function createClient(kind: ClientKind) {
  return postgres(getConnectionString(kind), CLIENT_OPTIONS);
}

type SqlClient = ReturnType<typeof createClient>;

declare global {
  var __dashboardPooledSql__: SqlClient | undefined;
  var __dashboardDirectSql__: SqlClient | undefined;
}

export function getSql(kind: ClientKind = 'pooled') {
  if (kind === 'direct') {
    if (!globalThis.__dashboardDirectSql__) {
      globalThis.__dashboardDirectSql__ = createClient('direct');
    }

    return globalThis.__dashboardDirectSql__;
  }

  if (!globalThis.__dashboardPooledSql__) {
    globalThis.__dashboardPooledSql__ = createClient('pooled');
  }

  return globalThis.__dashboardPooledSql__;
}

export function getDatabaseInfo(kind: ClientKind = 'pooled') {
  const connection =
    getConnectionCandidates(kind).find(([, value]) => value)?.[0] ??
    getConnectionCandidates(kind === 'direct' ? 'pooled' : 'direct').find(([, value]) => value)?.[0] ??
    'unknown';

  return {
    provider: 'neon',
    mode: kind,
    database: cleanEnvValue(process.env.POSTGRES_DATABASE) ?? cleanEnvValue(process.env.PGDATABASE) ?? 'unknown',
    connection,
  };
}

export function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Unknown database error';
}
