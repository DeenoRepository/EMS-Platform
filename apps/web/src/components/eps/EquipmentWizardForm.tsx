'use client';

import React, { useEffect, useState } from 'react';
import { Box, Button, CircularProgress, Paper, Step, StepLabel, Stepper, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import SaveIcon from '@mui/icons-material/Save';
import SendIcon from '@mui/icons-material/Send';
import { useSnackbar } from 'notistack';
import { buildEquipmentWizardPayload, validateEquipmentWizardInput } from './equipment-wizard-submit';
import { EquipmentWizardStepIdentification } from './EquipmentWizardStepIdentification';
import { EquipmentWizardStepTechnical } from './EquipmentWizardStepTechnical';
import { EquipmentWizardStepClassification } from './EquipmentWizardStepClassification';
import { EquipmentWizardStepReview } from './EquipmentWizardStepReview';

export interface TagItem {
  id: string;
  name: string;
  color: string | null;
}

export interface CustomFieldDef {
  id: string;
  sectionId: string | null;
  key: string;
  name: string;
  fieldType: 'TEXT' | 'TEXTAREA' | 'NUMBER' | 'DATE' | 'SELECT' | 'BOOLEAN';
  unit: string | null;
  isRequired: boolean;
  defaultValue: string | null;
  options?: string[];
}

export interface CustomSectionDef {
  id: string;
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  sortOrder: number;
  fields: CustomFieldDef[];
}

export const WIZARD_STEPS = [
  'Идентификация и размещение',
  'Технические характеристики',
  'Классификация и ввод в эксплуатацию',
  'Проверка и сохранение',
];

export interface EquipmentWizardFormProps {
  mode?: 'page' | 'dialog';
  onSuccess: (newEquipmentId: string) => void;
  onCancel?: () => void;
}

export function EquipmentWizardForm({ mode = 'dialog', onSuccess, onCancel }: EquipmentWizardFormProps) {
  const { enqueueSnackbar } = useSnackbar();
  const [activeStep, setActiveStep] = useState(0);
  const [name, setName] = useState('');
  const [inventoryNumber, setInventoryNumber] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [model, setModel] = useState('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [commissionDate, setCommissionDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});
  const [tags, setTags] = useState<TagItem[]>([]);
  const [sections, setSections] = useState<CustomSectionDef[]>([]);
  const [unassignedFields, setUnassignedFields] = useState<CustomFieldDef[]>([]);
  const [isLoadingMeta, setIsLoadingMeta] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setIsLoadingMeta(true);
    Promise.all([
      fetch('/api/eps/tags').then((response) => response.json()),
      fetch('/api/eps/custom-sections').then((response) => response.json()),
    ])
      .then(([tagsJson, sectionsJson]) => {
        if (tagsJson.success) setTags(tagsJson.data || []);
        if (sectionsJson.success && sectionsJson.data) {
          const nextSections = sectionsJson.data.sections || [];
          const nextUnassignedFields = sectionsJson.data.unassignedFields || [];
          setSections(nextSections);
          setUnassignedFields(nextUnassignedFields);
          const initialValues: Record<string, any> = {};
          [...nextSections.flatMap((section: CustomSectionDef) => section.fields), ...nextUnassignedFields].forEach((field: CustomFieldDef) => {
            if (field.fieldType === 'BOOLEAN') initialValues[field.key] = field.defaultValue === 'true';
            else if (field.defaultValue) initialValues[field.key] = field.defaultValue;
          });
          setCustomFieldValues(initialValues);
        }
      })
      .catch(() => {
        enqueueSnackbar('Ошибка загрузки справочников полей', { variant: 'error' });
      })
      .finally(() => setIsLoadingMeta(false));
  }, [enqueueSnackbar]);

  const handleCustomFieldChange = (key: string, value: any) => {
    setCustomFieldValues((previous) => ({ ...previous, [key]: value }));
  };

  const handleNextStep = () => {
    if (activeStep === 0 && !name.trim()) {
      enqueueSnackbar('Укажите наименование оборудования', { variant: 'warning' });
      return;
    }
    setActiveStep((previous) => Math.min(previous + 1, WIZARD_STEPS.length - 1));
  };

  const handlePrevStep = () => setActiveStep((previous) => Math.max(previous - 1, 0));

  const handleSave = async (submitForApproval: boolean) => {
    const validationError = validateEquipmentWizardInput({ name });
    if (validationError) {
      enqueueSnackbar(validationError, { variant: 'warning' });
      setActiveStep(0);
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = buildEquipmentWizardPayload({ name, inventoryNumber, serialNumber, manufacturer, model, location, status, commissionDate, tagIds: selectedTagIds, customFields: customFieldValues, submitForApproval });
      const response = await fetch('/api/eps/equipment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (response.ok && data.success && data.data) {
        enqueueSnackbar(submitForApproval ? 'Паспорт сохранен и отправлен на согласование' : 'Паспорт сохранен в черновик (виден только вам)', { variant: submitForApproval ? 'success' : 'info' });
        onSuccess(data.data.id);
      } else enqueueSnackbar(data.error || 'Ошибка при сохранении оборудования', { variant: 'error' });
    } catch {
      enqueueSnackbar('Ошибка сети при отправке данных', { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingMeta) {
    return <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8, gap: 2 }}><CircularProgress size={36} color="primary" /><Typography variant="body2" color="text.secondary">Загрузка структуры полей паспорта оборудования...</Typography></Box>;
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Paper elevation={0} sx={{ p: mode === 'dialog' ? 1.75 : 2.5, mb: 2.5, borderRadius: '10px', border: '1px solid divider', bgcolor: 'background.default' }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {WIZARD_STEPS.map((label, index) => <Step key={label} onClick={() => { if (index < activeStep || (index === 1 && name.trim())) setActiveStep(index); }} sx={{ cursor: 'pointer' }}><StepLabel sx={{ '& .MuiStepLabel-label': { fontSize: mode === 'dialog' ? '0.75rem' : '0.8125rem', fontWeight: activeStep === index ? 700 : 500, color: activeStep === index ? 'primary.main' : 'text.disabled' } }}>{label}</StepLabel></Step>)}
        </Stepper>
      </Paper>
      <Box sx={{ minHeight: 340 }}>
        {activeStep === 0 && <EquipmentWizardStepIdentification name={name} inventoryNumber={inventoryNumber} serialNumber={serialNumber} manufacturer={manufacturer} model={model} location={location} onNameChange={setName} onInventoryNumberChange={setInventoryNumber} onSerialNumberChange={setSerialNumber} onManufacturerChange={setManufacturer} onModelChange={setModel} onLocationChange={setLocation} />}
        {activeStep === 1 && <EquipmentWizardStepTechnical sections={sections} unassignedFields={unassignedFields} customFieldValues={customFieldValues} onCustomFieldChange={handleCustomFieldChange} />}
        {activeStep === 2 && <EquipmentWizardStepClassification status={status} commissionDate={commissionDate} tags={tags} selectedTagIds={selectedTagIds} onStatusChange={setStatus} onCommissionDateChange={setCommissionDate} onToggleTag={(tagId) => setSelectedTagIds((previous) => previous.includes(tagId) ? previous.filter((id) => id !== tagId) : [...previous, tagId])} />}
        {activeStep === 3 && <EquipmentWizardStepReview name={name} inventoryNumber={inventoryNumber} serialNumber={serialNumber} manufacturer={manufacturer} model={model} location={location} status={status} commissionDate={commissionDate} sections={sections} customFieldValues={customFieldValues} />}
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 2.5, mt: 3, borderTop: '1px solid divider' }}>
        <Box sx={{ display: 'flex', gap: 1 }}>{onCancel && <Button variant="text" onClick={onCancel} disabled={isSubmitting} sx={{ color: 'text.secondary', fontWeight: 600, height: 38 }}>Отмена</Button>}{activeStep > 0 && <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={handlePrevStep} disabled={isSubmitting} sx={{ height: 38, borderRadius: '8px', borderColor: 'divider', color: 'text.secondary', px: 2, fontWeight: 600, textTransform: 'none' }}>Назад</Button>}</Box>
        <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'center' }}>{activeStep < WIZARD_STEPS.length - 1 ? <Button variant="contained" endIcon={<ArrowForwardIcon />} onClick={handleNextStep} disabled={isSubmitting} sx={{ height: 38, borderRadius: '8px', fontWeight: 600, fontSize: '0.875rem', textTransform: 'none', px: 2.5, backgroundColor: 'primary.main', '&:hover': { backgroundColor: 'primary.dark' } }}>Далее</Button> : <><Button variant="outlined" startIcon={<SaveIcon />} onClick={() => handleSave(false)} disabled={isSubmitting || !name.trim()} sx={{ height: 38, borderRadius: '8px', fontWeight: 600, fontSize: '0.875rem', textTransform: 'none', px: 2 }}>Сохранить в черновик</Button><Button variant="contained" startIcon={<SendIcon />} onClick={() => handleSave(true)} disabled={isSubmitting || !name.trim()} sx={{ height: 38, borderRadius: '8px', fontWeight: 700, fontSize: '0.875rem', textTransform: 'none', px: 2.25, backgroundColor: 'primary.main', '&:hover': { backgroundColor: 'primary.dark' } }}>Отправить на согласование</Button></>}</Box>
      </Box>
    </Box>
  );
}

export default EquipmentWizardForm;
