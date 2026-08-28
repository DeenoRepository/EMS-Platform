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
  paper = false,
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
        borderBottom: paper ? 'none' : 'none',
        minHeight: 44,
        '& .MuiTabs-indicator': {
          backgroundColor: 'primary.main',
          height: 2.5,
          borderRadius: '2px 2px 0 0',
        },
        '& .MuiTab-root': {
          minHeight: 44,
          py: 1,
          px: { xs: 1.5, sm: 2 },
          fontWeight: 600,
          fontSize: '0.8125rem',
          textTransform: 'none',
          letterSpacing: 0,
          color: 'text.secondary',
          transition: 'color 0.15s ease',
          '&:hover': {
            color: 'text.primary',
          },
          '&.Mui-selected': {
            color: 'primary.main',
          },
        },
      }}
    >
      {tabs.map((t) => {
        const isSelected = value === t.value;
        const badgeBg =
          t.badgeColor === 'error'
            ? 'error.light'
            : t.badgeColor === 'warning'
            ? 'warning.light'
            : t.badgeColor === 'success'
            ? 'success.light'
            : isSelected ? 'action.selected' : 'action.hover';
        const badgeTextColor =
          t.badgeColor === 'error'
            ? 'error.main'
            : t.badgeColor === 'warning'
            ? 'warning.main'
            : t.badgeColor === 'success'
            ? 'success.main'
            : isSelected ? 'primary.main' : 'text.secondary';

        return (
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
                    sx={{
                      height: 19,
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      px: 0.35,
                      fontFeatureSettings: '"tnum"',
                      borderRadius: '20px',
                      backgroundColor: badgeBg,
                      color: badgeTextColor,
                    }}
                  />
                )}
              </Box>
            }
          />
        );
      })}
    </Tabs>
  );

  if (paper) {
    return (
      <Paper
        className={className}
        elevation={0}
        sx={{
          borderRadius: '12px',
          border: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden',
          bgcolor: 'background.paper',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.02)',
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
      sx={{ display: isSelected ? 'block' : 'none' }}
    >
      {children}
    </Box>
  );
}

export default TabPanel;
