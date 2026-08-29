'use client';

import React from 'react';
import { Box, Card, CardContent, Divider, Table, TableBody, TableCell, TableContainer, TableRow, Typography } from '@mui/material';
import CategoryIcon from '@mui/icons-material/Category';
import EngineeringIcon from '@mui/icons-material/Engineering';
import BoltIcon from '@mui/icons-material/Bolt';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import ShieldIcon from '@mui/icons-material/Shield';
import StraightenIcon from '@mui/icons-material/Straighten';
import SpeedIcon from '@mui/icons-material/Speed';
import TuneIcon from '@mui/icons-material/Tune';
import { CustomFieldValueRenderer } from '@/components/eps/CustomFieldValueRenderer';
import type { CustomFieldDef, CustomSectionDef } from '@/app/eps/[id]/page';

interface EquipmentPassportTechnicalSectionsProps {
  custom: Record<string, unknown>;
  sections: CustomSectionDef[];
  unassignedFields: CustomFieldDef[];
  onCopy: (text: string, label: string) => void;
}

const SECTION_ICONS: Record<string, React.ReactNode> = {
  Category: <CategoryIcon color="primary" />,
  Speed: <SpeedIcon color="error" />,
  Shield: <ShieldIcon color="success" />,
  Engineering: <EngineeringIcon color="warning" />,
  Bolt: <BoltIcon color="warning" />,
  WaterDrop: <WaterDropIcon color="info" />,
  Straighten: <StraightenIcon color="secondary" />,
  Tune: <TuneIcon color="primary" />,
};

function hasValue(custom: Record<string, unknown>, key: string) {
  return custom[key] !== undefined && custom[key] !== null && custom[key] !== '';
}

function TechnicalFieldsTable({ fields, custom, onCopy }: { fields: CustomFieldDef[]; custom: Record<string, unknown>; onCopy: (text: string, label: string) => void }) {
  return (
    <TableContainer>
      <Table size="small">
        <TableBody>
          {fields.map((field) => (
            <TableRow key={field.id}>
              <TableCell sx={{ fontWeight: 500, color: 'text.secondary', width: '45%', py: 1, borderBottom: '1px solid action.hover' }}>
                {field.name}
              </TableCell>
              <TableCell sx={{ fontWeight: 600, py: 1, borderBottom: '1px solid action.hover' }}>
                <CustomFieldValueRenderer field={field} value={custom[field.key]} onCopy={onCopy} />
                {field.unit && (
                  <Typography component="span" variant="caption" sx={{ color: 'text.secondary', ml: 0.5 }}>
                    {field.unit}
                  </Typography>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export function EquipmentPassportTechnicalSections({ custom, sections, unassignedFields, onCopy }: EquipmentPassportTechnicalSectionsProps) {
  const visibleUnassignedFields = unassignedFields.filter((field) => hasValue(custom, field.key));

  return (
    <GridTechnicalSections>
      {sections.map((section) => {
        const sectionFields = section.fields.filter((field) => hasValue(custom, field.key));
        if (sectionFields.length === 0) return null;

        return (
          <Card key={section.id} sx={{ borderRadius: '12px', border: '1px solid divider', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                {SECTION_ICONS[section.icon || 'Category'] || <CategoryIcon color="primary" />}
                <Box>
                  <Typography variant="h6" fontWeight={700}>
                    {section.name}
                  </Typography>
                  {section.description && (
                    <Typography variant="caption" color="text.secondary">
                      {section.description}
                    </Typography>
                  )}
                </Box>
              </Box>
              <Divider sx={{ mb: 1.5 }} />
              <TechnicalFieldsTable fields={sectionFields} custom={custom} onCopy={onCopy} />
            </CardContent>
          </Card>
        );
      })}

      {visibleUnassignedFields.length > 0 && (
        <Card sx={{ borderRadius: '12px', border: '1px solid divider', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              <EngineeringIcon color="primary" />
              <Typography variant="h6" fontWeight={700}>
                Прочие технические характеристики
              </Typography>
            </Box>
            <Divider sx={{ mb: 1.5 }} />
            <TechnicalFieldsTable fields={visibleUnassignedFields} custom={custom} onCopy={onCopy} />
          </CardContent>
        </Card>
      )}
    </GridTechnicalSections>
  );
}

function GridTechnicalSections({ children }: { children: React.ReactNode }) {
  return <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>{children}</Box>;
}

export function EquipmentPassportTechnicalSectionsEmptyState() {
  return (
    <Card sx={{ borderRadius: '12px', border: '1px solid divider' }}>
      <CardContent sx={{ p: 4, textAlign: 'center' }}>
        <TuneIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
        <Typography variant="subtitle1" fontWeight={700} color="text.secondary">
          Технические характеристики не настроены
        </Typography>
        <Typography variant="body2" color="text.secondary">
          В системе еще не заданы пользовательские технические параметры для паспортов оборудования.
        </Typography>
      </CardContent>
    </Card>
  );
}
