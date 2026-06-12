import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { resolveTestDatabaseUrl } from './e2e-env';

/**
 * Roda uma vez antes da suíte e2e: aplica as migrations committadas no banco
 * de teste (criando-o se não existir). Os specs assumem schema em dia e
 * cuidam apenas dos próprios dados (truncate + factories).
 */
export default function globalSetup(): void {
  const databaseUrl = resolveTestDatabaseUrl();
  execSync('npx prisma migrate deploy', {
    cwd: join(__dirname, '..'),
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'inherit',
  });
}
