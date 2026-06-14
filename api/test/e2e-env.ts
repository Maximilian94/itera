/**
 * Ambiente do e2e: aponta o Prisma para um banco DEDICADO de teste antes de
 * qualquer import de app (setupFiles roda antes dos specs). O seed do e2e
 * trunca tabelas, então jamais pode rodar contra o banco de dev — daí o
 * banco padrão `itera_test` (mesma instância Postgres do docker-compose) e a
 * trava que exige "test" no nome do banco quando TEST_DATABASE_URL é usada.
 */
export function resolveTestDatabaseUrl(): string {
  const url =
    process.env.TEST_DATABASE_URL ??
    'postgresql://itera:itera@localhost:5432/itera_test?schema=public';

  const dbName = new URL(url).pathname.replace(/^\//, '');
  if (!/test/i.test(dbName)) {
    throw new Error(
      `E2E exige um banco dedicado de teste (nome contendo "test"); recebeu "${dbName}". ` +
        'Ajuste TEST_DATABASE_URL — a suíte trunca tabelas e destruiria dados de dev.',
    );
  }
  return url;
}

process.env.DATABASE_URL = resolveTestDatabaseUrl();
