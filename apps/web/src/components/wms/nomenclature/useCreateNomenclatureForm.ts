import { useState, useEffect } from 'react';
import {
  CategoryOption,
  NOMENCLATURE_TYPES,
  SKU_RANDOM_BASE,
  SKU_RANDOM_RANGE,
} from './CreateNomenclatureSubcomponents';

interface UseCreateNomenclatureFormProps {
  open: boolean;
  initialName?: string;
  initialType?: string;
  initialQuantity?: number;
  initialCategories?: CategoryOption[];
}

function loadCategories(
  open: boolean,
  initialCategories: CategoryOption[] | undefined,
  setCategories: (cats: CategoryOption[]) => void
) {
  if (initialCategories && initialCategories.length > 0) {
    setCategories(initialCategories);
    return;
  }
  if (!open) return;
  fetch('/api/wms/categories')
    .then((res) => res.json())
    .then((json) => {
      if (json.success) setCategories(json.data);
    })
    .catch(console.error);
}

function generateRandomSku(selectedType: string): string {
  const typeObj = NOMENCLATURE_TYPES.find((t) => t.id === selectedType) || NOMENCLATURE_TYPES[0];
  const rand = Math.floor(SKU_RANDOM_BASE + Math.random() * SKU_RANDOM_RANGE);
  return `${typeObj.prefix}-${rand}`;
}

export function useCreateNomenclatureForm(props: UseCreateNomenclatureFormProps) {
  const { open, initialName, initialType, initialQuantity, initialCategories } = props;
  const [selectedType, setSelectedType] = useState(initialType || 'SPARE_PART');
  const [name, setName] = useState(initialName || '');
  const [article, setArticle] = useState('');
  const [unit, setUnit] = useState('шт');
  const [categoryId, setCategoryId] = useState('');
  const [minStock, setMinStock] = useState('');
  const [description, setDescription] = useState('');
  const [categories, setCategories] = useState<CategoryOption[]>(initialCategories || []);
  const [receiptQuantity, setReceiptQuantity] = useState<string>(String(initialQuantity || '1'));
  const [receiptCellId, setReceiptCellId] = useState<string>('');

  useEffect(() => {
    if (!open) return;
    setName(initialName || '');
    setSelectedType(initialType || 'SPARE_PART');
    setReceiptQuantity(String(initialQuantity || '1'));
    setReceiptCellId('');
  }, [open, initialName, initialType, initialQuantity]);

  useEffect(() => {
    loadCategories(open, initialCategories, setCategories);
  }, [open, initialCategories]);

  const handleReset = () => {
    setSelectedType('SPARE_PART');
    setName('');
    setArticle('');
    setUnit('шт');
    setCategoryId('');
    setMinStock('');
    setDescription('');
    setReceiptQuantity('1');
    setReceiptCellId('');
  };

  const handleGenerateSku = () => {
    setArticle(generateRandomSku(selectedType));
  };

  return {
    selectedType,
    setSelectedType,
    name,
    setName,
    article,
    setArticle,
    unit,
    setUnit,
    categoryId,
    setCategoryId,
    minStock,
    setMinStock,
    description,
    setDescription,
    categories,
    receiptQuantity,
    setReceiptQuantity,
    receiptCellId,
    setReceiptCellId,
    handleReset,
    handleGenerateSku,
  };
}

