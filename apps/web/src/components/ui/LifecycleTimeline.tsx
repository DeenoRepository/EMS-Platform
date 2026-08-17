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
  useTheme,
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
  { label: string; color: string; icon: React.ComponentType<any> }
> = {
  COMMISSIONING: {
    label: 'Ввод в эксплуатацию',
    color: '#16a34a',
    icon: PlayCircleOutlineOutlinedIcon,
  },
  MAINTENANCE: {
    label: 'Техническое обслуживание',
    color: '#0284c7',
    icon: BuildCircleOutlinedIcon,
  },
  INCIDENT: {
    label: 'Инцидент / Сбой',
    color: '#dc2626',
    icon: ReportProblemOutlinedIcon,
  },
  PARTS_REPLACED: {
    label: 'Замена узлов / ТМЦ',
    color: '#7c3aed',
    icon: Inventory2OutlinedIcon,
  },
  TRANSFER: {
    label: 'Перемещение',
    color: '#0f766e',
    icon: SwapHorizOutlinedIcon,
  },
  STATUS_CHANGE: {
    label: 'Смена статуса',
    color: '#d97706',
    icon: PublishedWithChangesOutlinedIcon,
  },
  DECOMMISSIONING: {
    label: 'Вывод из эксплуатации',
    color: '#64748b',
    icon: StopCircleOutlinedIcon,
  },
  AUDIT: {
    label: 'Инспекция / Аудит',
    color: '#475569',
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
  const theme = useTheme();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const displayedEvents = maxItems ? events.slice(0, maxItems) : events;

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const Content = (
    <Box sx={{ p: paper ? 2.5 : 1 }} className={className}>
      {title && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
          <Typography variant="h6" fontWeight={700} sx={{ fontSize: '1rem' }}>
            {title}
          </Typography>
          <Chip
            label={`${events.length} событий`}
            size="small"
            variant="outlined"
            sx={{ fontWeight: 600, fontSize: '0.6875rem', height: 20 }}
          />
        </Box>
      )}

      {loading ? (
        <Stack spacing={2}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Box key={i} sx={{ display: 'flex', gap: 2 }}>
              <Skeleton variant="circular" width={32} height={32} />
              <Box sx={{ flex: 1 }}>
                <Skeleton variant="text" width="60%" height={24} />
                <Skeleton variant="text" width="40%" height={16} />
              </Box>
            </Box>
          ))}
        </Stack>
      ) : displayedEvents.length === 0 ? (
        <Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>
          <Typography variant="body2">{emptyMessage}</Typography>
        </Box>
      ) : (
        <Box sx={{ position: 'relative', pl: 1 }}>
          {/* Vertical Connecting Line */}
          <Box
            sx={{
              position: 'absolute',
              top: 16,
              bottom: 16,
              left: 21,
              width: '2px',
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#e2e8f0',
              zIndex: 0,
            }}
          />

          {/* Timeline Nodes */}
          <Stack spacing={2.5}>
            {displayedEvents.map((evt, idx) => {
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
                    gap: 2,
                  }}
                >
                  {/* Node Icon Avatar */}
                  <Box
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      bgcolor: 'background.paper',
                      border: `2px solid ${cfg.color}`,
                      color: cfg.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      mt: 0.25,
                      boxShadow: `0 0 0 3px ${cfg.color}15`,
                    }}
                  >
                    <IconComponent sx={{ fontSize: 16 }} />
                  </Box>

                  {/* Event Content Box */}
                  <Box
                    sx={{
                      flex: 1,
                      p: 1.5,
                      borderRadius: 1.5,
                      bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#f8fafc',
                      border: '1px solid',
                      borderColor: 'divider',
                      transition: 'all 0.15s ease',
                      '&:hover': {
                        borderColor: `${cfg.color}40`,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
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
                              bgcolor: `${cfg.color}15`,
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
                            }}
                          >
                            {formatDateTime(evt.date)}
                          </Typography>
                        </Box>

                        <Typography variant="subtitle2" fontWeight={700} sx={{ fontSize: '0.875rem' }}>
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
                          }}
                          aria-label="Развернуть детали события"
                        >
                          <ExpandMoreIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Box>

                    {/* Author / Performer info */}
                    {evt.author && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, fontSize: '0.75rem' }}>
                        Исполнитель: <b>{evt.author}</b>
                      </Typography>
                    )}

                    {/* Collapsible Details */}
                    <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                      <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                        {evt.description && (
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem', mb: 1 }}>
                            {evt.description}
                          </Typography>
                        )}

                        {evt.metadata && Object.keys(evt.metadata).length > 0 && (
                          <Box
                            sx={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                              gap: 1,
                              p: 1,
                              bgcolor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.2)' : '#ffffff',
                              borderRadius: 1,
                              border: '1px solid',
                              borderColor: 'divider',
                              mb: 1,
                            }}
                          >
                            {Object.entries(evt.metadata).map(([k, v]) => (
                              <Box key={k}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6875rem' }}>
                                  {k}
                                </Typography>
                                <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.75rem' }}>
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
                            endIcon={<ArrowForwardIcon />}
                            sx={{ p: 0, fontSize: '0.75rem', fontWeight: 600 }}
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
          borderRadius: 2,
          bgcolor: 'background.paper',
        }}
      >
        {Content}
      </Paper>
    );
  }

  return Content;
}

export default LifecycleTimeline;
