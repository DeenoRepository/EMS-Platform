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
        return <CheckCircleIcon sx={{ fontSize: 20, color: 'success.main' }} />;
      case 'REJECTED':
        return <CancelIcon sx={{ fontSize: 20, color: 'error.main' }} />;
      case 'IN_PROGRESS':
      case 'PENDING':
        return <HourglassEmptyIcon sx={{ fontSize: 20, color: 'warning.main' }} />;
      case 'CANCELLED':
        return <BlockIcon sx={{ fontSize: 20, color: 'text.secondary' }} />;
      case 'DRAFT':
      default:
        return <EditNoteIcon sx={{ fontSize: 20, color: 'text.disabled' }} />;
    }
  };

  const content = (
    <Box className={className} sx={{ p: paper ? { xs: 2, sm: 2.5 } : 0 }}>
      {title && (
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2, color: 'text.primary', letterSpacing: '-0.01em' }}>
          {title}
        </Typography>
      )}

      <Stepper
        orientation={orientation}
        sx={{
          '& .MuiStepLabel-root': {
            py: orientation === 'vertical' ? 1 : 0,
          },
          '& .MuiStepConnector-line': {
            borderColor: 'divider',
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
                        ? 'success.light'
                        : step.status === 'REJECTED'
                        ? 'error.light'
                        : step.status === 'IN_PROGRESS' || step.status === 'PENDING'
                        ? 'warning.light'
                        : 'background.default',
                    border: '1px solid',
                    borderColor:
                      step.status === 'APPROVED' || step.status === 'COMPLETED'
                        ? 'success.light'
                        : step.status === 'REJECTED'
                        ? 'error.light'
                        : step.status === 'IN_PROGRESS' || step.status === 'PENDING'
                        ? 'warning.light'
                        : 'divider',
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
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem' }} display="block">
                      {step.subtitle}
                    </Typography>
                  )}
                </Box>
                <StatusBadge status={step.status} size="small" />
              </Box>
            </StepLabel>

            {orientation === 'vertical' && (
              <StepContent sx={{ borderLeftColor: 'divider' }}>
                <Box sx={{ pl: 1, pb: 1, color: 'text.secondary', fontSize: '0.8125rem' }}>
                  {step.user && (
                    <Typography variant="caption" display="block" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                      Ответственный: <Box component="strong" sx={{ color: 'text.primary' }}>{step.user}</Box>
                    </Typography>
                  )}
                  {step.date && (
                    <Typography variant="caption" display="block" sx={{ color: 'text.secondary', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                      Дата: {formatDateTime(step.date)}
                    </Typography>
                  )}
                  {step.comment && (
                    <Box
                      sx={{
                        mt: 1,
                        p: 1.25,
                        bgcolor: 'background.default',
                        borderRadius: '8px',
                        borderLeft: '3px solid',
                        borderColor:
                          step.status === 'APPROVED'
                            ? 'success.main'
                            : step.status === 'REJECTED'
                            ? 'error.main'
                            : 'primary.main',
                      }}
                    >
                      <Typography variant="caption" sx={{ fontStyle: 'italic', display: 'block', color: 'text.secondary' }}>
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
      <Paper elevation={0} sx={{ borderRadius: '12px', border: '1px solid', borderColor: 'divider', backgroundColor: 'background.paper' }}>
        {content}
      </Paper>
    );
  }

  return content;
}
