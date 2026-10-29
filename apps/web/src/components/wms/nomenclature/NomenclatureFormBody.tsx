'use client';

import React from 'react';
import { Stack } from '@mui/material';
import {
  NomenclatureTypePills,
  NomenclatureNameField,
  NomenclatureSkuAndUnit,
  NomenclatureReceiptFields,
  NomenclatureCategoryAndStock,
  NomenclatureDescriptionField,
  StorageCellOption,
} from './CreateNomenclatureSubcomponents';
import type { useCreateNomenclatureForm } from './useCreateNomenclatureForm';

export interface NomenclatureFormBodyProps {
  form: ReturnType<typeof useCreateNomenclatureForm>;
  showReceiptFields?: boolean;
  warehouseName?: string;
  cells?: StorageCellOption[];
}

function BasicNomenclatureFields({ form }: { form: ReturnType<typeof useCreateNomenclatureForm> }) {
  return (
    <>
      <NomenclatureTypePills
        selectedType={form.selectedType}
        onSelectType={form.setSelectedType}
      />
      <NomenclatureNameField
        name={form.name}
        onNameChange={form.setName}
      />
      <NomenclatureSkuAndUnit
        article={form.article}
        onArticleChange={form.setArticle}
        onGenerateSku={form.handleGenerateSku}
        unit={form.unit}
        onUnitChange={form.setUnit}
      />
    </>
  );
}

export function NomenclatureFormBody({
  form,
  showReceiptFields = false,
  warehouseName,
  cells = [],
}: NomenclatureFormBodyProps) {
  return (
    <Stack spacing={2}>
      <BasicNomenclatureFields form={form} />

      {showReceiptFields && (
        <NomenclatureReceiptFields
          warehouseName={warehouseName}
          cells={cells}
          receiptQuantity={form.receiptQuantity}
          onQuantityChange={form.setReceiptQuantity}
          receiptCellId={form.receiptCellId}
          onCellChange={form.setReceiptCellId}
        />
      )}

      <NomenclatureCategoryAndStock
        categoryId={form.categoryId}
        onCategoryChange={form.setCategoryId}
        categories={form.categories}
        minStock={form.minStock}
        onMinStockChange={form.setMinStock}
      />

      <NomenclatureDescriptionField
        description={form.description}
        onDescriptionChange={form.setDescription}
      />
    </Stack>
  );
}

