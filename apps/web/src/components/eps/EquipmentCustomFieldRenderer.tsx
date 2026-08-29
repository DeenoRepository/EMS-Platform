import React from 'react';
import {
  Box,
  Chip,
  FormControlLabel,
  InputAdornment,
  MenuItem,
  Paper,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import type { CustomFieldDef } from './EquipmentWizardForm';

export interface EquipmentCustomFieldRendererProps {
  definition: CustomFieldDef;
  value: unknown;
  onChange: (key: string, value: unknown) => void;
}

function RequiredFieldLabel({ definition }: { definition: CustomFieldDef }) {
  return (
    <Typography variant="body2" fontWeight={600} color="text.secondary" sx={{ mb: 0.5 }}>
      {definition.name}{' '}
      {definition.isRequired && (
        <Box component="span" sx={{ color: 'error.main' }}>
          *
        </Box>
      )}
    </Typography>
  );
}

export function EquipmentCustomFieldRenderer({
  definition,
  value,
  onChange,
}: EquipmentCustomFieldRendererProps) {
  if (definition.fieldType === 'BOOLEAN') {
    return (
      <Box key={definition.key} sx={{ gridColumn: { xs: 'span 1', sm: 'span 1' } }}>
        <Paper variant="outlined" sx={{ p: 1.5, height: '100%', display: 'flex', alignItems: 'center', borderRadius: '8px' }}>
          <FormControlLabel
            control={
              <Switch
                checked={Boolean(value)}
                onChange={(event) => onChange(definition.key, event.target.checked)}
                color="primary"
              />
            }
            label={
              <Typography variant="body2" fontWeight={600}>
                {definition.name}
              </Typography>
            }
          />
        </Paper>
      </Box>
    );
  }

  if (definition.fieldType === 'SELECT' && definition.options && Array.isArray(definition.options)) {
    return (
      <Box key={definition.key} sx={{ gridColumn: { xs: 'span 1', sm: 'span 1' } }}>
        <RequiredFieldLabel definition={definition} />
        <TextField
          select
          fullWidth
          size="small"
          required={definition.isRequired}
          value={value || ''}
          onChange={(event) => onChange(definition.key, event.target.value)}
        >
          <MenuItem value="">— Не выбрано —</MenuItem>
          {definition.options.map((option) => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))}
        </TextField>
      </Box>
    );
  }

  if (definition.fieldType === 'TEXTAREA') {
    return (
      <Box key={definition.key} sx={{ gridColumn: { xs: 'span 1', sm: 'span 2' } }}>
        <RequiredFieldLabel definition={definition} />
        <TextField
          multiline
          rows={2}
          fullWidth
          size="small"
          required={definition.isRequired}
          value={value || ''}
          onChange={(event) => onChange(definition.key, event.target.value)}
        />
      </Box>
    );
  }

  return (
    <Box key={definition.key} sx={{ gridColumn: { xs: 'span 1', sm: 'span 1' } }}>
      <RequiredFieldLabel definition={definition} />
      <TextField
        type={definition.fieldType === 'NUMBER' ? 'number' : definition.fieldType === 'DATE' ? 'date' : 'text'}
        InputProps={
          definition.unit
            ? {
                endAdornment: (
                  <InputAdornment position="end">
                    <Chip label={definition.unit} size="small" variant="outlined" sx={{ fontWeight: 700, height: 22 }} />
                  </InputAdornment>
                ),
              }
            : undefined
        }
        fullWidth
        size="small"
        required={definition.isRequired}
        value={value || ''}
        onChange={(event) => onChange(definition.key, event.target.value)}
      />
    </Box>
  );
}

export default EquipmentCustomFieldRenderer;
