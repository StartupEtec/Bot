import { config } from './config.js';

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: 99 };

export function createLogger(level = config.logLevel) {
  const threshold = LEVELS[String(level).toLowerCase()] ?? LEVELS.info;

  function emit(method, name, args) {
    if (LEVELS[name] < threshold) return;

    const prefix = `[${new Date().toISOString()}] ${name.toUpperCase()}`;
    const output = method === 'error' ? console.error : console.log;
    output(prefix, ...args);
  }

  return {
    debug: (...args) => emit('log', 'debug', args),
    info: (...args) => emit('log', 'info', args),
    warn: (...args) => emit('warn', 'warn', args),
    error: (...args) => emit('error', 'error', args),
  };
}

export const logger = createLogger();
