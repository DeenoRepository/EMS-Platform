'use client';

import React from 'react';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Typography,
  Paper,
  Chip,
  Tooltip,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import EditNoteIcon from '@mui/icons-material/EditNote';
import BlockIcon from '@mui/icons-material/Block';
import { StatusBadge } from './StatusBadge';
import { formatDateTime } from '@ems/shared';

export type StepStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'IN_PROGRESS' | 'DRAFT' | 'COMPLETED';

export interface ApprovalStepItem {
  id?: string;
  label: string;
  subtitle?: string;
  status: StepStatus;
  user?: string;
  date?: string;
  comment?: string;
}

export interface ApprovalStepperProps {
  steps: ApprovalStepItem[];
  orientation?: 'horizontal' | 'vertical';
  paper?: boolean;
  title?: string;
  className?: string;
}

export function ApprovalStepper({
  steps,
  orientation = 'vertical',
  paper = true,
  title = 'Маршрут и статус согласования',
  className,
}: ApprovalStepperProps) {
  const getStepIcon = (status: StepStatus) => {
    switch (status) {
      case 'APPROVED':
      case 'COMPLETED':
        return <CheckCircleIcon sx={{ fontSize: 20, color: '#16a34a' }} />;
      case 'REJECTED':
        return <CancelIcon sx={{ fontSize: 20, color: '#dc2626' }} />;
      case 'IN_PROGRESS':
      case 'PENDING':
        return <HourglassEmptyIcon sx={{ fontSize: 20, color: '#d97706' }} />;
      case 'CANCELLED':
        return <BlockIcon sx={{ fontSize: 20, color: '#64748b' }} />;
      case 'DRAFT':
      default:
        return <EditNoteIcon sx={{ fontSize: 20, color: '#94a3b8' }} />;
    }
  };

  const content = (
    <Box className={className} sx={{ p: paper ? { xs: 2, sm: 2.5 } : 0 }}>
      {title && (
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
          {title}
        </Typography>
      )}

      <Stepper
        orientation={orientation}
        sx={{
          '& .MuiStepLabel-root': {
            py: orientation === 'vertical' ? 1 : 0,
          },
        }}
      >
        {steps.map((step, idx) => (
          <Step key={step.id || idx} active={step.status === 'IN_PROGRESS' || step.status === 'PENDING'} completed={step.status === 'APPROVED' || step.status === 'COMPLETED'}>
            <StepLabel
              StepIconComponent={() => (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    bgcolor:
                      step.status === 'APPROVED' || step.status === 'COMPLETED'
                        ? '#f0fdf4'
                        : step.status === 'REJECTED'
                        ? '#fef2f2'
                        : step.status === 'IN_PROGRESS' || step.status === 'PENDING'
                        ? '#fffbeb'
                        : '#f8fafc',
                    border: '1px solid',
                    borderColor:
                      step.status === 'APPROVED' || step.status === 'COMPLETED'
                        ? '#bbf7d0'
                        : step.status === 'REJECTED'
                        ? '#fecaca'
                        : step.status === 'IN_PROGRESS' || step.status === 'PENDING'
                        ? '#fde68a'
                        : '#e2e8f0',
                  }}
                >
                  {getStepIcon(step.status)}
                </Box>
              )}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
                <Box>
                  <Typography variant="body2" fontWeight={600} color="text.primary">
                    {step.label}
                  </Typography>
                  {step.subtitle && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      {step.subtitle}
                    </Typography>
                  )}
                </Box>
                <StatusBadge status={step.status} size="small" />
              </Box>
            </StepLabel>

            {orientation === 'vertical' && (
              <StepContent>
                <Box sx={{ pl: 1, pb: 1, color: 'text.secondary', fontSize: '0.8125rem' }}>
                  {step.user && (
                    <Typography variant="caption" display="block" color="text.secondary">
                      Ответственный: <strong>{step.user}</strong>
                    </Typography>
                  )}
                  {step.date && (
                    <Typography variant="caption" display="block" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                      Дата: {formatDateTime(step.date)}
                    </Typography>
                  )}
                  {step.comment && (
                    <Box
                      sx={{
                        mt: 1,
                        p: 1.25,
                        bgcolor: 'grey.50',
                        borderRadius: 1.5,
                        borderLeft: '3px solid',
                        borderColor:
                          step.status === 'APPROVED'
                            ? '#16a34a'
                            : step.status === 'REJECTED'
                            ? '#dc2626'
                            : 'primary.main',
                      }}
                    >
                      <Typography variant="caption" sx={{ fontStyle: 'italic', display: 'block' }}>
                        «{step.comment}»
                      </Typography>
                    </Box>
                  )}
                </Box>
              </StepContent>
            )}
          </Step>
        ))}
      </Stepper>
    </Box>
  );

  if (paper) {
    return (
      <Paper variant="outlined" sx={{ borderRadius: 2 }}>
        {content}
      </Paper>
    );
  }

  return content;
}
