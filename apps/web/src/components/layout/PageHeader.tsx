'use client';

import React from 'react';
import { Box, Typography, Breadcrumbs, Link as MuiLink } from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import Link from 'next/link';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
}

export default function PageHeader({ title, subtitle, breadcrumbs, actions }: PageHeaderProps) {
  return (
    <Box sx={{ mb: 3 }}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumbs
          separator={<NavigateNextIcon sx={{ fontSize: 13, color: '#94a3b8' }} />}
          aria-label="навигация"
          sx={{ mb: 1, '& .MuiBreadcrumbs-li': { fontSize: '0.75rem', lineHeight: 1 } }}
        >
          {breadcrumbs.map((b, index) => {
            const isLast = index === breadcrumbs.length - 1;
            if (isLast || !b.href) {
              return (
                <Typography
                  key={index}
                  sx={{
                    color: '#64748b',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                  }}
                >
                  {b.label}
                </Typography>
              );
            }
            return (
              <MuiLink
                key={index}
                component={Link}
                href={b.href}
                underline="hover"
                sx={{
                  color: '#64748b',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  transition: 'color 0.15s ease',
                  '&:hover': { color: '#0284c7' },
                }}
              >
                {b.label}
              </MuiLink>
            );
          })}
        </Breadcrumbs>
      )}

      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: 2,
        }}
      >
        <Box>
          <Typography
            variant="h1"
            component="h1"
            sx={{
              fontSize: { xs: '1.375rem', sm: '1.625rem' },
              fontWeight: 800,
              color: '#0f172a',
              letterSpacing: '-0.025em',
              lineHeight: 1.2,
            }}
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography
              variant="body2"
              sx={{
                mt: 0.5,
                color: '#64748b',
                fontSize: '0.875rem',
                fontWeight: 400,
                lineHeight: 1.4,
              }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>

        {actions && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              flexWrap: 'wrap',
              flexShrink: 0,
            }}
          >
            {actions}
          </Box>
        )}
      </Box>
    </Box>
  );
}
