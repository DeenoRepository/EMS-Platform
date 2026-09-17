#!/usr/bin/env node

const fs = require('node:fs');
const { PrismaClient } = require('@prisma/client');
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

async function main() {
  if (!process.argv.includes('--read-only')) {
    throw new Error('Read-only audit requires the explicit --read-only flag');
  }
  assertLocalDatabaseTarget();

  const prisma = new PrismaClient();
  try {
    const [operations, inventories, transfers, stockItems] = await Promise.all([
      prisma.stockOperation.findMany({ include: { items: true } }),
      prisma.inventory.findMany({ include: { items: true } }),
      prisma.stockTransfer.findMany({ include: { items: true } }),
      prisma.stockItem.findMany({ select: { warehouseId: true, nomenclatureId: true } }),
    ]);

    const report = auditLegacyRecords({ operations, inventories, transfers, stockItems });
    const outputPath = process.argv[process.argv.indexOf('--output') + 1];
    const serialized = JSON.stringify(report, null, 2);
    if (outputPath && outputPath !== '--read-only') {
      fs.writeFileSync(outputPath, `${serialized}\n`, 'utf8');
    } else {
      process.stdout.write(`${serialized}\n`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(`WMS legacy audit refused or failed: ${error.message}`);
  process.exitCode = 2;
});
