import { describe, test } from 'node:test';
import assert from 'node:assert';
import {
  detectDocumentTypeFromFileName,
  extractDecimalNumberFromFileName,
  matchFileNameToTargets,
} from '../eps-document-matcher';

describe('EPS Document Matcher: Type, Decimal & Model Detection', () => {
  describe('detectDocumentTypeFromFileName', () => {
    test('detects PASSPORT from Russian keywords and GOST codes', () => {
      assert.strictEqual(detectDocumentTypeFromFileName('Паспорт насоса К-102.pdf').type, 'PASSPORT');
      assert.strictEqual(detectDocumentTypeFromFileName('Формуляр_изделия_К102.pdf').type, 'PASSPORT');
      assert.strictEqual(detectDocumentTypeFromFileName('АБВГ.123456.001ПС.pdf').type, 'PASSPORT');
      assert.strictEqual(detectDocumentTypeFromFileName('ПС_Насос_центробежный.pdf').type, 'PASSPORT');
    });

    test('detects MANUAL from Russian keywords and GOST codes', () => {
      assert.strictEqual(detectDocumentTypeFromFileName('Руководство по эксплуатации GA 45.pdf').type, 'MANUAL');
      assert.strictEqual(detectDocumentTypeFromFileName('Инструкция_по_монтажу_и_ТО.docx').type, 'MANUAL');
      assert.strictEqual(detectDocumentTypeFromFileName('АБВГ.123456.001 РЭ.pdf').type, 'MANUAL');
      assert.strictEqual(detectDocumentTypeFromFileName('Регламент технического обслуживания.pdf').type, 'MANUAL');
    });

    test('detects SCHEMA from keywords and drawing extensions', () => {
      assert.strictEqual(detectDocumentTypeFromFileName('Схема принципиальная электрическая.pdf').type, 'SCHEMA');
      assert.strictEqual(detectDocumentTypeFromFileName('Чертёж сборочный СБ.pdf').type, 'SCHEMA');
      assert.strictEqual(detectDocumentTypeFromFileName('АБВГ.123456.001 Э3.pdf').type, 'SCHEMA');
      assert.strictEqual(detectDocumentTypeFromFileName('монтажная_схема.dwg').type, 'SCHEMA');
      assert.strictEqual(detectDocumentTypeFromFileName('pump_model.dxf').type, 'SCHEMA');
    });

    test('detects CERTIFICATE from keywords', () => {
      assert.strictEqual(detectDocumentTypeFromFileName('Сертификат соответствия ТР ТС 010.pdf').type, 'CERTIFICATE');
      assert.strictEqual(detectDocumentTypeFromFileName('Декларация о соответствии ЕАС.pdf').type, 'CERTIFICATE');
    });

    test('detects ACT from keywords', () => {
      assert.strictEqual(detectDocumentTypeFromFileName('Акт ввода в промышленную эксплуатацию.pdf').type, 'ACT');
      assert.strictEqual(detectDocumentTypeFromFileName('Протокол приемочных испытаний.pdf').type, 'ACT');
      assert.strictEqual(detectDocumentTypeFromFileName('Свидетельство о поверке манометра.pdf').type, 'ACT');
    });

    test('falls back to OTHER when no keywords match', () => {
      assert.strictEqual(detectDocumentTypeFromFileName('Неизвестный_файл_123.pdf').type, 'OTHER');
    });
  });

  describe('extractDecimalNumberFromFileName', () => {
    test('extracts canonical ESKD decimal numbers', () => {
      assert.strictEqual(
        extractDecimalNumberFromFileName('АБВГ.123456.001ПС.pdf'),
        'АБВГ.123456.001'
      );
      assert.strictEqual(
        extractDecimalNumberFromFileName('Чертеж ЦДПР.468311.002-01.pdf'),
        'ЦДПР.468311.002-01'
      );
      assert.strictEqual(
        extractDecimalNumberFromFileName('УФКР.431211.003 РЭ Руководство.pdf'),
        'УФКР.431211.003'
      );
    });

    test('returns null when no decimal number is present', () => {
      assert.strictEqual(extractDecimalNumberFromFileName('Паспорт насоса К-102.pdf'), null);
      assert.strictEqual(extractDecimalNumberFromFileName('Инструкция.pdf'), null);
    });
  });

  describe('matchFileNameToTargets', () => {
    const catalog = {
      models: [
        { model: 'GA 45 VSD+', count: 2 },
        { model: 'GA 45', count: 5 },
        { model: 'К-102', count: 3 },
      ],
      decimalNumbers: [
        { decimalNumber: 'АБВГ.123456.001', count: 3 },
        { decimalNumber: 'ЦДПР.468311.002', count: 1 },
      ],
      equipmentList: [
        { id: 'eq-1', name: 'Насос охлаждения', inventoryNumber: 'EQ-2024-001', model: 'К-102', decimalNumber: 'АБВГ.123456.001' },
        { id: 'eq-2', name: 'Компрессор винтовой', inventoryNumber: 'EQ-2024-002', model: 'GA 45 VSD+', decimalNumber: 'ЦДПР.468311.002' },
      ],
    };

    test('matches document by decimal number with priority over generic model', () => {
      const result = matchFileNameToTargets('АБВГ.123456.001ПС Паспорт К-102.pdf', catalog);
      assert.strictEqual(result.detectedDocType, 'PASSPORT');
      assert.strictEqual(result.suggestedBindingMode, 'DECIMAL');
      assert.strictEqual(result.matchedDecimalNumber, 'АБВГ.123456.001');
      assert.strictEqual(result.matchedModel, 'К-102');
      assert.strictEqual(result.matchingEquipmentCount, 3);
      assert.strictEqual(result.confidence, 'high');
    });

    test('matches document by model when decimal number is absent', () => {
      const result = matchFileNameToTargets('Руководство_GA 45 VSD+_компрессор.pdf', catalog);
      assert.strictEqual(result.detectedDocType, 'MANUAL');
      assert.strictEqual(result.suggestedBindingMode, 'MODEL');
      assert.strictEqual(result.matchedModel, 'GA 45 VSD+');
      assert.strictEqual(result.matchingEquipmentCount, 2);
      assert.strictEqual(result.confidence, 'high');
    });

    test('matches document by inventory number when present', () => {
      const result = matchFileNameToTargets('Акт_ввода_EQ-2024-001.pdf', catalog);
      assert.strictEqual(result.detectedDocType, 'ACT');
      assert.strictEqual(result.suggestedBindingMode, 'EQUIPMENT');
      assert.strictEqual(result.matchedEquipment?.id, 'eq-1');
      assert.strictEqual(result.confidence, 'high');
    });

    test('handles unknown filename gracefully', () => {
      const result = matchFileNameToTargets('какой-то_файл_без_меток.pdf', catalog);
      assert.strictEqual(result.detectedDocType, 'OTHER');
      assert.strictEqual(result.suggestedBindingMode, null);
      assert.strictEqual(result.confidence, 'none');
    });
  });
});
