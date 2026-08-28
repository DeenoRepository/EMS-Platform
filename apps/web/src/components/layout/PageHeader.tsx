'use client';

import React from 'react';
import { Box, Typography, Breadcrumbs, Link as MuiLink } from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import Link from 'next/link';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  tabs?: React.ReactNode;
}

export default function PageHeader({ title, subtitle, breadcrumbs, actions, tabs }: PageHeaderProps) {
  return (
    <Box sx={{ mb: tabs ? 2 : 2.25 }}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumbs
          className="no-print"
          separator={<NavigateNextIcon sx={{ fontSize: 13, color: 'text.disabled' }} />}
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
                    color: 'text.secondary',
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
                  color: 'primary.main',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  transition: 'color 0.15s ease',
                  '&:hover': { color: 'primary.dark', textDecoration: 'underline' },
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
              color: 'text.primary',
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
                color: 'text.secondary',
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
            className="no-print page-header-actions"
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

      {tabs && (
        <Box
          className="no-print"
          sx={{
            mt: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          {tabs}
        </Box>
      )}
    </Box>
  );
}
