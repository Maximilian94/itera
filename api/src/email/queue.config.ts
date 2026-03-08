/**
 * Configuração centralizada do Redis para BullMQ.
 * Usa variáveis de ambiente: REDIS_HOST, REDIS_PORT, REDIS_PASSWORD, REDIS_URL.
 * REDIS_URL tem precedência quando definida (formato: redis://[:password@]host:port).
 */
export function getBullConnectionOptions(): {
  host: string;
  port: number;
  password?: string;
  maxRetriesPerRequest: number | null;
} {
  const url = process.env.REDIS_URL;
  if (url) {
    try {
      const parsed = new URL(url);
      return {
        host: parsed.hostname,
        port: parsed.port ? parseInt(parsed.port, 10) : 6379,
        password: parsed.password || undefined,
        maxRetriesPerRequest: null,
      };
    } catch {
      // fallback para host/port
    }
  }

  const host = process.env.REDIS_HOST ?? 'localhost';
  const port = parseInt(process.env.REDIS_PORT ?? '6379', 10);
  const password = process.env.REDIS_PASSWORD || undefined;

  return {
    host,
    port,
    password: password || undefined,
    maxRetriesPerRequest: null,
  };
}
