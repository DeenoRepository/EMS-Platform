#!/usr/bin/env node

const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const { auditLegacyRecords } = require('./wms-legacy-mapping');

function assertLocalDatabaseTarget() {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) throw new Error('DATABASE_URL is required for the read-only audit');

  const url = new URL(rawUrl);
  const allowedHosts = new Set(['localhost', '127.0.0.1', '::1']);
  if (!allowedHosts.has(url.hostname)) {
    throw new Error(`Refusing non-local database target: ${url.hostname}`);
  }
  if (process.env.WMS_AUDIT_ALLOW_LOCAL !== '1') {
    throw new Error('Set WMS_AUDIT_ALLOW_LOCAL=1 to explicitly allow a local read-only audit');
  }
}

function readJsonQuery(databaseUrl, query) {
  const result = execFileSync(
    'psql',
    [databaseUrl, '-X', '-q', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-c', `BEGIN; SET TRANSACTION READ ONLY; ${query}; COMMIT;`],
    { encoding: 'utf8', env: process.env }
  ).trim();
  return result ? JSON.parse(result) : [];
}

function psqlDatabaseUrl(rawUrl) {
  const url = new URL(rawUrl);
  url.searchParams.delete('schema');
  return url.toString();
}

function loadLegacyRecords(databaseUrl) {
  const operations = readJsonQuery(databaseUrl, `
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', o.id, 'warehouseId', o."warehouseId", 'type', o.type::text,
      'items', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'id', i.id, 'nomenclatureId', i."nomenclatureId", 'quantity', i.quantity::text
      )) FROM "StockOperationItem" i WHERE i."operationId" = o.id), '[]'::jsonb)
    )), '[]'::jsonb)::text FROM "StockOperation" o`);
  const inventories = readJsonQuery(databaseUrl, `
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', inv.id, 'warehouseId', inv."warehouseId",
      'items', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'id', i.id, 'nomenclatureId', i."nomenclatureId",
        'expectedQty', i."expectedQty"::text, 'actualQty', i."actualQty"::text
      )) FROM "InventoryItem" i WHERE i."inventoryId" = inv.id), '[]'::jsonb)
    )), '[]'::jsonb)::text FROM "Inventory" inv`);
  const transfers = readJsonQuery(databaseUrl, `
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', t.id, 'status', t.status::text,
      'items', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'id', i.id, 'nomenclatureId', i."nomenclatureId", 'quantity', i.quantity::text
      )) FROM "StockTransferItem" i WHERE i."transferId" = t.id), '[]'::jsonb)
    )), '[]'::jsonb)::text FROM "StockTransfer" t`);
  const stockItems = readJsonQuery(databaseUrl, `
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'warehouseId', s."warehouseId", 'nomenclatureId', s."nomenclatureId"
    )), '[]'::jsonb)::text FROM "StockItem" s`);
  return { operations, inventories, transfers, stockItems };
}

async function main() {
  if (!process.argv.includes('--read-only')) {
    throw new Error('Read-only audit requires the explicit --read-only flag');
  }
  assertLocalDatabaseTarget();

  const { operations, inventories, transfers, stockItems } = loadLegacyRecords(psqlDatabaseUrl(process.env.DATABASE_URL));
  const report = auditLegacyRecords({ operations, inventories, transfers, stockItems });
  const outputPath = process.argv[process.argv.indexOf('--output') + 1];
  const serialized = JSON.stringify(report, null, 2);
  if (outputPath && outputPath !== '--read-only') {
    fs.writeFileSync(outputPath, `${serialized}\n`, 'utf8');
  } else {
    process.stdout.write(`${serialized}\n`);
  }
}

main().catch((error) => {
  console.error(`WMS legacy audit refused or failed: ${error.message}`);
  process.exitCode = 2;
});
