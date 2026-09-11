import { test, describe } from 'node:test';
import assert from 'node:assert';
import zlib from 'node:zlib';
import { parseDatabaseUrl } from '../database-backup-service';

describe('Database Backup Service', () => {
  describe('parseDatabaseUrl', () => {
    test('correctly parses standard postgresql URL', () => {
      const url = 'postgresql://postgres:secret123@localhost:5432/ems_platform';
      const config = parseDatabaseUrl(url);

      assert.strictEqual(config.host, 'localhost');
      assert.strictEqual(config.port, '5432');
      assert.strictEqual(config.user, 'postgres');
      assert.strictEqual(config.password, 'secret123');
      assert.strictEqual(config.database, 'ems_platform');
      assert.strictEqual(config.schema, 'public');
    });

    test('correctly parses postgres:// alias with custom schema', () => {
      const url = 'postgres://admin_user:P%40ssw0rd@192.168.1.50:5433/prod_ems?schema=custom_schema';
      const config = parseDatabaseUrl(url);

      assert.strictEqual(config.host, '192.168.1.50');
      assert.strictEqual(config.port, '5433');
      assert.strictEqual(config.user, 'admin_user');
      assert.strictEqual(config.password, 'P@ssw0rd');
      assert.strictEqual(config.database, 'prod_ems');
      assert.strictEqual(config.schema, 'custom_schema');
    });

    test('throws error when database URL is empty', () => {
      assert.throws(() => {
        parseDatabaseUrl('');
      }, /DATABASE_URL/);
    });
  });

  describe('Gzip Compression Utility', () => {
    test('compresses and decompresses sql text cleanly', () => {
      const sampleSql = '-- EMS Platform SQL Dump\nCREATE TABLE test (id SERIAL PRIMARY KEY, name VARCHAR(255));\n';
      const compressed = zlib.gzipSync(Buffer.from(sampleSql, 'utf-8'));
      assert.ok(compressed.length > 0);

      const decompressed = zlib.gunzipSync(compressed).toString('utf-8');
      assert.strictEqual(decompressed, sampleSql);
    });
  });
});
