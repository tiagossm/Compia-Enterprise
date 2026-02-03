export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const levelOrder: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

function resolveLevel(): LogLevel {
  const raw = (Deno.env.get('LOG_LEVEL') || 'info').toLowerCase();
  if (raw === 'debug' || raw === 'info' || raw === 'warn' || raw === 'error') {
    return raw;
  }
  return 'info';
}

export function createLogger(scope: string) {
  const minLevel = resolveLevel();
  const minValue = levelOrder[minLevel];

  const log = (level: LogLevel, message: string, meta?: unknown) => {
    if (levelOrder[level] < minValue) return;

    const prefix = `[${scope}] ${message}`;
    if (meta !== undefined) {
      const payload = meta instanceof Error
        ? { message: meta.message, stack: meta.stack }
        : meta;
      // eslint-disable-next-line no-console
      console[level](prefix, payload);
    } else {
      // eslint-disable-next-line no-console
      console[level](prefix);
    }
  };

  return {
    debug: (msg: string, meta?: unknown) => log('debug', msg, meta),
    info: (msg: string, meta?: unknown) => log('info', msg, meta),
    warn: (msg: string, meta?: unknown) => log('warn', msg, meta),
    error: (msg: string, meta?: unknown) => log('error', msg, meta)
  };
}
