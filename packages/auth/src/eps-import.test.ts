import { test, describe } from 'node:test';
import assert from 'node:assert';

describe('EPS Smart Import & Storage Security Suite', () => {
  // ─── 1. Smart Import Header Matching & Collision Resolution ───
  describe('Smart Import Column Matching & Collision Detection', () => {
    function normalizeHeader(str: string): string {
      return str
        .toLowerCase()
        .replace(/[*[\]()]/g, '')
        .trim();
    }

    const KNOWN_BASE_RULES = [
      { key: 'name', aliases: ['наименование оборудования', 'наименование', 'название', 'оборудование', 'name', 'title', 'equipment name'] },
      { key: 'inventoryNumber', aliases: ['инвентарный номер', 'инвентарный', 'инв. номер', 'инв номер', 'инв. №', 'инв №', 'инв.', 'инв', 'inventorynumber', 'inventory number', 'inv number', 'inv no'] },
      { key: 'serialNumber', aliases: ['заводской номер', 'серийный номер', 'заводской / серийный номер', 'зав. номер', 'зав. №', 'зав №', 'серийный', 'serialnumber', 'serial number', 'serial', 'sn'] },
      { key: 'manufacturer', aliases: ['производитель', 'изготовитель', 'бренд', 'завод-изготовитель', 'вендор', 'manufacturer', 'vendor', 'brand', 'make'] },
      { key: 'model', aliases: ['модель', 'модификация', 'модель / модификация', 'марка', 'тип оборудования', 'model', 'type'] },
      { key: 'location', aliases: ['место установки', 'локация', 'цех', 'участок', 'местоположение', 'помещение', 'location', 'site', 'placement'] },
    ];

    function matchColumn(header: string): string | null {
      const norm = normalizeHeader(header);
      const matched = KNOWN_BASE_RULES.find((rule) =>
        rule.aliases.some((alias) => norm === alias || norm.startsWith(alias) || alias.startsWith(norm))
      );
      return matched ? matched.key : null;
    }

    test('Successfully matches various Russian & English column header aliases', () => {
      assert.strictEqual(matchColumn('Инвентарный № [обязательно]'), 'inventoryNumber');
      assert.strictEqual(matchColumn('Наименование оборудования *'), 'name');
      assert.strictEqual(matchColumn('Заводской / серийный номер'), 'serialNumber');
      assert.strictEqual(matchColumn('Завод-изготовитель'), 'manufacturer');
      assert.strictEqual(matchColumn('Место установки (Цех/участок)'), 'location');
      assert.strictEqual(matchColumn('Model/Type'), 'model');
    });

    test('Detects database collisions by inventory number and flags row state', () => {
      const existingInventoryNumbers = new Set(['EQ-100', 'EQ-200']);
      const existingSerialNumbers = new Set(['SN-999']);

      function validateImportRow(row: { name?: string; inventoryNumber?: string; serialNumber?: string }) {
        if (!row.name || !row.name.trim()) {
          return { status: 'ERROR', message: 'Отсутствует наименование' };
        }
        if (row.inventoryNumber && existingInventoryNumbers.has(row.inventoryNumber.trim())) {
          return { status: 'COLLISION', message: `Совпадение по инв. № ${row.inventoryNumber}` };
        }
        if (row.serialNumber && existingSerialNumbers.has(row.serialNumber.trim())) {
          return { status: 'COLLISION', message: `Совпадение по серийному № ${row.serialNumber}` };
        }
        return { status: 'NEW', message: 'Готово к созданию' };
      }

      assert.strictEqual(validateImportRow({ name: 'Насос', inventoryNumber: 'EQ-100' }).status, 'COLLISION');
      assert.strictEqual(validateImportRow({ name: 'Компрессор', serialNumber: 'SN-999' }).status, 'COLLISION');
      assert.strictEqual(validateImportRow({ name: '', inventoryNumber: 'EQ-300' }).status, 'ERROR');
      assert.strictEqual(validateImportRow({ name: 'Новый станок', inventoryNumber: 'EQ-500' }).status, 'NEW');
    });
  });

  // ─── 2. File Storage & Security Rules ───
  describe('Document & Photo Storage Security', () => {
    const ALLOWED_DOC_EXTS = new Set(['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.dwg', '.dxf', '.jpg', '.png']);
    const ALLOWED_PHOTO_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

    function validateFileUpload(fileName: string, subFolder: 'documents' | 'photos', sizeBytes: number) {
      const ext = (fileName.match(/\.[^.]+$/)?.[0] || '').toLowerCase();
      const allowed = subFolder === 'photos' ? ALLOWED_PHOTO_EXTS : ALLOWED_DOC_EXTS;
      const maxSize = subFolder === 'photos' ? 20 * 1024 * 1024 : 50 * 1024 * 1024;

      if (!allowed.has(ext)) {
        throw new Error(`Недопустимое расширение файла: ${ext}`);
      }
      if (sizeBytes > maxSize) {
        throw new Error('Превышен допустимый размер файла');
      }
      return true;
    }

    test('Allows valid engineering drawing and document formats', () => {
      assert.strictEqual(validateFileUpload('drawing.dwg', 'documents', 1024 * 1024), true);
      assert.strictEqual(validateFileUpload('passport.pdf', 'documents', 2 * 1024 * 1024), true);
      assert.strictEqual(validateFileUpload('photo.webp', 'photos', 500 * 1024), true);
    });

    test('Rejects dangerous and executable file extensions', () => {
      assert.throws(() => validateFileUpload('script.exe', 'documents', 100), /Недопустимое расширение/);
      assert.throws(() => validateFileUpload('payload.sh', 'documents', 100), /Недопустимое расширение/);
      assert.throws(() => validateFileUpload('malware.php', 'photos', 100), /Недопустимое расширение/);
      assert.throws(() => validateFileUpload('macro.bat', 'documents', 100), /Недопустимое расширение/);
    });

    test('Rejects files exceeding size limits', () => {
      assert.throws(() => validateFileUpload('large_photo.jpg', 'photos', 25 * 1024 * 1024), /Превышен допустимый размер/);
      assert.throws(() => validateFileUpload('huge_doc.pdf', 'documents', 60 * 1024 * 1024), /Превышен допустимый размер/);
    });
  });
});
