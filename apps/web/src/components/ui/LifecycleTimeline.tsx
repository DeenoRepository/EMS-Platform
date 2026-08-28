'use client';

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Skeleton,
  Stack,
  IconButton,
  Collapse,
  Button,
} from '@mui/material';
import Link from 'next/link';
import BuildCircleOutlinedIcon from '@mui/icons-material/BuildCircleOutlined';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import SwapHorizOutlinedIcon from '@mui/icons-material/SwapHorizOutlined';
import PlayCircleOutlineOutlinedIcon from '@mui/icons-material/PlayCircleOutlineOutlined';
import StopCircleOutlinedIcon from '@mui/icons-material/StopCircleOutlined';
import PublishedWithChangesOutlinedIcon from '@mui/icons-material/PublishedWithChangesOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { formatDateTime } from '@ems/shared';

export type LifecycleEventType =
  | 'COMMISSIONING'
  | 'MAINTENANCE'
  | 'INCIDENT'
  | 'PARTS_REPLACED'
  | 'TRANSFER'
  | 'STATUS_CHANGE'
  | 'DECOMMISSIONING'
  | 'AUDIT';

export interface LifecycleEvent {
  id: string;
  type: LifecycleEventType;
  title: string;
  description?: string;
  date: string;
  author?: string;
  status?: string;
  metadata?: Record<string, string | number>;
  link?: { label: string; href: string };
}

export interface LifecycleTimelineProps {
  events: LifecycleEvent[];
  title?: string;
  loading?: boolean;
  maxItems?: number;
  emptyMessage?: string;
  paper?: boolean;
  className?: string;
}

const EVENT_CONFIG: Record<
  LifecycleEventType,
  { label: string; color: string; bg: string; icon: React.ComponentType<any> }
> = {
  COMMISSIONING: {
    label: 'Ввод в эксплуатацию',
    color: 'success.main',
    bg: 'success.light',
    icon: PlayCircleOutlineOutlinedIcon,
  },
  MAINTENANCE: {
    label: 'Техническое обслуживание',
    color: 'primary.main',
    bg: 'primary.light',
    icon: BuildCircleOutlinedIcon,
  },
  INCIDENT: {
    label: 'Инцидент / Сбой',
    color: 'error.main',
    bg: 'error.light',
    icon: ReportProblemOutlinedIcon,
  },
  PARTS_REPLACED: {
    label: 'Замена узлов / ТМЦ',
    color: 'secondary.main',
    bg: 'secondary.light',
    icon: Inventory2OutlinedIcon,
  },
  TRANSFER: {
    label: 'Перемещение',
    color: 'info.main',
    bg: 'info.light',
    icon: SwapHorizOutlinedIcon,
  },
  STATUS_CHANGE: {
    label: 'Смена статуса',
    color: 'warning.main',
    bg: 'warning.light',
    icon: PublishedWithChangesOutlinedIcon,
  },
  DECOMMISSIONING: {
    label: 'Вывод из эксплуатации',
    color: 'text.secondary',
    bg: 'action.hover',
    icon: StopCircleOutlinedIcon,
  },
  AUDIT: {
    label: 'Инспекция / Аудит',
    color: 'text.primary',
    bg: 'action.hover',
    icon: FactCheckOutlinedIcon,
  },
};

export function LifecycleTimeline({
  events,
  title = 'Хронология жизненного цикла',
  loading = false,
  maxItems,
  emptyMessage = 'События жизненного цикла еще не зарегистрированы',
  paper = true,
  className,
}: LifecycleTimelineProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const displayedEvents = maxItems ? events.slice(0, maxItems) : events;

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const Content = (
    <Box sx={{ p: paper ? 2.5 : 1 }} className={className}>
      {title && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
          <Typography variant="h6" fontWeight={700} sx={{ fontSize: '1rem', color: 'text.primary', letterSpacing: '-0.01em' }}>
            {title}
          </Typography>
          <Chip
            label={`${events.length} событий`}
            size="small"
            sx={{
              fontWeight: 600,
              fontSize: '0.6875rem',
              height: 22,
              backgroundColor: 'action.hover',
              color: 'text.secondary',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: '4px',
            }}
          />
        </Box>
      )}

      {loading ? (
        <Stack spacing={2}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Box key={i} sx={{ display: 'flex', gap: 2 }}>
              <Skeleton variant="circular" width={28} height={28} />
              <Box sx={{ flex: 1 }}>
                <Skeleton variant="text" width="60%" height={24} />
                <Skeleton variant="text" width="40%" height={16} />
              </Box>
            </Box>
          ))}
        </Stack>
      ) : displayedEvents.length === 0 ? (
        <Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>
          <Typography variant="body2" sx={{ fontSize: '0.8125rem' }}>{emptyMessage}</Typography>
        </Box>
      ) : (
        <Box sx={{ position: 'relative', pl: 0.5 }}>
          {/* Vertical Connecting Line */}
          <Box
            sx={{
              position: 'absolute',
              top: 14,
              bottom: 14,
              left: 17,
              width: '2px',
              bgcolor: 'divider',
              zIndex: 0,
            }}
          />

          {/* Timeline Nodes */}
          <Stack spacing={2}>
            {displayedEvents.map((evt) => {
              const cfg = EVENT_CONFIG[evt.type] || EVENT_CONFIG.AUDIT;
              const IconComponent = cfg.icon;
              const isExpanded = expandedId === evt.id;
              const hasDetails = evt.description || (evt.metadata && Object.keys(evt.metadata).length > 0) || evt.link;

              return (
                <Box
                  key={evt.id}
                  sx={{
                    position: 'relative',
                    zIndex: 1,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 1.5,
                  }}
                >
                  {/* Node Icon Avatar */}
                  <Box
                    sx={{
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      bgcolor: 'background.paper',
                      border: '2px solid',
                      borderColor: cfg.color,
                      color: cfg.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      mt: 0.25,
                    }}
                  >
                    <IconComponent sx={{ fontSize: 14 }} />
                  </Box>

                  {/* Event Content Box */}
                  <Box
                    sx={{
                      flex: 1,
                      p: 1.5,
                      borderRadius: '8px',
                      bgcolor: 'background.default',
                      border: '1px solid',
                      borderColor: 'divider',
                      transition: 'all 0.15s ease',
                      '&:hover': {
                        borderColor: cfg.color,
                        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
                        bgcolor: 'background.paper',
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
                          <Chip
                            label={cfg.label}
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: '0.625rem',
                              fontWeight: 700,
                              bgcolor: cfg.bg,
                              color: cfg.color,
                              borderRadius: '4px',
                            }}
                          />
                          <Typography
                            variant="caption"
                            sx={{
                              color: 'text.secondary',
                              fontFamily: 'monospace',
                              fontSize: '0.75rem',
                              fontFeatureSettings: '"tnum"',
                            }}
                          >
                            {formatDateTime(evt.date)}
                          </Typography>
                        </Box>

                        <Typography variant="subtitle2" fontWeight={700} sx={{ fontSize: '0.8125rem', color: 'text.primary' }}>
                          {evt.title}
                        </Typography>
                      </Box>

                      {hasDetails && (
                        <IconButton
                          size="small"
                          onClick={() => toggleExpand(evt.id)}
                          sx={{
                            transform: isExpanded ? 'rotate(180deg)' : 'none',
                            transition: 'transform 0.2s ease',
                            p: 0.25,
                            color: 'text.secondary',
                          }}
                          aria-label="Развернуть детали события"
                        >
                          <ExpandMoreIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Box>

                    {/* Author / Performer info */}
                    {evt.author && (
                      <Typography variant="caption" sx={{ display: 'block', mt: 0.5, fontSize: '0.75rem', color: 'text.secondary' }}>
                        Исполнитель: <Box component="b" sx={{ color: 'text.primary' }}>{evt.author}</Box>
                      </Typography>
                    )}

                    {/* Collapsible Details */}
                    <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                      <Box sx={{ mt: 1.25, pt: 1.25, borderTop: '1px solid', borderColor: 'divider' }}>
                        {evt.description && (
                          <Typography variant="body2" sx={{ fontSize: '0.8125rem', mb: 1, color: 'text.secondary', lineHeight: 1.45 }}>
                            {evt.description}
                          </Typography>
                        )}

                        {evt.metadata && Object.keys(evt.metadata).length > 0 && (
                          <Box
                            sx={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                              gap: 1,
                              p: 1.25,
                              bgcolor: 'background.paper',
                              borderRadius: '6px',
                              border: '1px solid',
                              borderColor: 'divider',
                              mb: 1,
                            }}
                          >
                            {Object.entries(evt.metadata).map(([k, v]) => (
                              <Box key={k}>
                                <Typography variant="caption" sx={{ fontSize: '0.6875rem', color: 'text.secondary' }}>
                                  {k}
                                </Typography>
                                <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.75rem', color: 'text.primary' }}>
                                  {String(v)}
                                </Typography>
                              </Box>
                            ))}
                          </Box>
                        )}

                        {evt.link && (
                          <Button
                            component={Link}
                            href={evt.link.href}
                            size="small"
                            variant="text"
                            endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
                            sx={{ p: 0, fontSize: '0.75rem', fontWeight: 600, color: 'primary.main' }}
                          >
                            {evt.link.label}
                          </Button>
                        )}
                      </Box>
                    </Collapse>
                  </Box>
                </Box>
              );
            })}
          </Stack>
        </Box>
      )}
    </Box>
  );

  if (paper) {
    return (
      <Paper
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '12px',
          bgcolor: 'background.paper',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.02)',
        }}
      >
        {Content}
      </Paper>
    );
  }

  return Content;
}

export default LifecycleTimeline;
