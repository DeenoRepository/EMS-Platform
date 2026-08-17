'use client';

import React from 'react';
import {
  Box,
  Tabs,
  Tab,
  Paper,
  Chip,
  Typography,
} from '@mui/material';

export interface TabItem {
  label: string;
  value: string | number;
  icon?: React.ReactElement;
  badge?: number | string;
  badgeColor?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success' | 'default';
  disabled?: boolean;
}

export interface NavTabsContainerProps {
  tabs: TabItem[];
  value: string | number;
  onChange: (value: any) => void;
  variant?: 'standard' | 'scrollable' | 'fullWidth';
  scrollButtons?: 'auto' | true | false;
  paper?: boolean;
  className?: string;
}

export function NavTabsContainer({
  tabs,
  value,
  onChange,
  variant = 'scrollable',
  scrollButtons = 'auto',
  paper = true,
  className,
}: NavTabsContainerProps) {
  const handleChange = (_: React.SyntheticEvent, newValue: any) => {
    onChange(newValue);
  };

  const tabsContent = (
    <Tabs
      value={value}
      onChange={handleChange}
      variant={variant}
      scrollButtons={scrollButtons}
      aria-label="Навигационные вкладки"
      sx={{
        borderBottom: paper ? 'none' : '1px solid',
        borderColor: 'divider',
        minHeight: 44,
        '& .MuiTab-root': {
          minHeight: 44,
          py: 1,
          px: { xs: 1.5, sm: 2.25 },
          fontWeight: 600,
          fontSize: '0.8125rem',
          textTransform: 'none',
          letterSpacing: 0,
        },
      }}
    >
      {tabs.map((t) => (
        <Tab
          key={String(t.value)}
          value={t.value}
          icon={t.icon}
          iconPosition="start"
          disabled={t.disabled}
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography component="span" variant="inherit">
                {t.label}
              </Typography>
              {t.badge !== undefined && t.badge !== null && (
                <Chip
                  label={t.badge}
                  size="small"
                  color={t.badgeColor || (value === t.value ? 'primary' : 'default')}
                  sx={{
                    height: 18,
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    px: 0.25,
                    fontFeatureSettings: '"tnum"',
                  }}
                />
              )}
            </Box>
          }
        />
      ))}
    </Tabs>
  );

  if (paper) {
    return (
      <Paper
        className={className}
        variant="outlined"
        sx={{
          borderRadius: 2,
          overflow: 'hidden',
          bgcolor: 'background.paper',
        }}
      >
        {tabsContent}
      </Paper>
    );
  }

  return <Box className={className}>{tabsContent}</Box>;
}

export interface TabPanelProps {
  children?: React.ReactNode;
  value: string | number;
  currentValue: string | number;
  keepMounted?: boolean;
  className?: string;
}

export function TabPanel({
  children,
  value,
  currentValue,
  keepMounted = false,
  className,
}: TabPanelProps) {
  const isSelected = value === currentValue;

  if (!isSelected && !keepMounted) {
    return null;
  }

  return (
    <Box
      role="tabpanel"
      hidden={!isSelected}
      id={`tabpanel-${value}`}
      aria-labelledby={`tab-${value}`}
      className={className}
      sx={{
        display: isSelected ? 'block' : 'none',
        pt: 2.5,
      }}
    >
      {children}
    </Box>
  );
}
