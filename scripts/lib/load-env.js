const fs = require('fs');
const path = require('path');

/**
 * Loads the first available env file without overwriting explicitly supplied
 * process variables. It intentionally does not provide database or secret
 * fallbacks: operational scripts must fail closed when configuration is
 * missing instead of silently targeting a local/demo database.
 */
function loadEnvFiles(extraPaths = []) {
  const candidates = [
    ...extraPaths,
    path.resolve(process.cwd(), '.env.production'),
    path.resolve(process.cwd(), '.env'),
    path.resolve(__dirname, '../../.env.production'),
    path.resolve(__dirname, '../../.env'),
    '/opt/ems-platform/.env.production',
    '/opt/ems-platform/.env',
    '/etc/ems-platform.env',
  ];

  const loaded = [];
  for (const envPath of [...new Set(candidates)]) {
    if (!fs.existsSync(envPath)) continue;
    try {
      const content = fs.readFileSync(envPath, 'utf8');
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const separator = trimmed.indexOf('=');
        if (separator <= 0) continue;
        const key = trimmed.slice(0, separator).trim();
        const rawValue = trimmed.slice(separator + 1).trim();
        const value =
          (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
          (rawValue.startsWith("'") && rawValue.endsWith("'"))
            ? rawValue.slice(1, -1)
            : rawValue;
        if (!process.env[key]) process.env[key] = value;
      }
      loaded.push(envPath);
    } catch (error) {
      throw new Error(`Не удалось прочитать файл окружения ${envPath}: ${error.message}`);
    }
  }
  return loaded;
}

function requireDatabaseUrl() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL не задан. Перед запуском ручного скрипта задайте его в окружении или .env/.env.production.'
    );
  }
  return process.env.DATABASE_URL;
}

module.exports = { loadEnvFiles, requireDatabaseUrl };
