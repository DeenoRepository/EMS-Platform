import { createTheme } from '@mui/material/styles';
import { ruRU } from '@mui/material/locale';

export const MONO_FONT_FAMILY = [
  'ui-monospace',
  'SFMono-Regular',
  '"JetBrains Mono"',
  'Menlo',
  'Monaco',
  'Consolas',
  '"Liberation Mono"',
  '"Courier New"',
  'monospace',
].join(',');

export const SANS_FONT_FAMILY = [
  'Inter',
  '-apple-system',
  'BlinkMacSystemFont',
  '"Segoe UI"',
  'Roboto',
  '"Helvetica Neue"',
  'Arial',
  'sans-serif',
].join(',');

export const theme = createTheme(
  {
    palette: {
      mode: 'light',
      primary: {
        main: '#0284c7', // Sky-600
        light: '#38bdf8',
        dark: '#0369a1',
        contrastText: '#ffffff',
      },
      secondary: {
        main: '#0f766e',
        light: '#14b8a6',
        dark: '#115e59',
        contrastText: '#ffffff',
      },
      background: {
        default: '#f8fafc',
        paper: '#ffffff',
      },
      text: {
        primary: '#0f172a', // Slate-900
        secondary: '#475569', // Slate-600
        disabled: '#94a3b8',
      },
      success: {
        main: '#16a34a',
        light: '#dcfce7',
        dark: '#15803d',
      },
      warning: {
        main: '#d97706',
        light: '#fef3c7',
        dark: '#b45309',
      },
      error: {
        main: '#dc2626',
        light: '#fee2e2',
        dark: '#b91c1c',
      },
      info: {
        main: '#2563eb',
        light: '#dbeafe',
        dark: '#1d4ed8',
      },
      divider: '#e2e8f0',
    },
    typography: {
      fontFamily: SANS_FONT_FAMILY,
      h1: {
        fontSize: '1.625rem', // 26px
        lineHeight: 1.2,
        fontWeight: 800,
        letterSpacing: '-0.025em',
        color: '#0f172a',
      },
      h2: {
        fontSize: '1.375rem', // 22px
        lineHeight: 1.25,
        fontWeight: 700,
        letterSpacing: '-0.02em',
        color: '#0f172a',
      },
      h3: {
        fontSize: '1.125rem', // 18px
        lineHeight: 1.3,
        fontWeight: 700,
        color: '#0f172a',
      },
      h4: {
        fontSize: '1rem', // 16px
        lineHeight: 1.35,
        fontWeight: 600,
        color: '#0f172a',
      },
      h5: {
        fontSize: '0.875rem', // 14px
        lineHeight: 1.35,
        fontWeight: 600,
        color: '#0f172a',
      },
      h6: {
        fontSize: '0.8125rem', // 13px
        lineHeight: 1.35,
        fontWeight: 600,
        color: '#0f172a',
      },
      subtitle1: {
        fontSize: '0.875rem', // 14px
        lineHeight: 1.4,
        fontWeight: 600,
        color: '#0f172a',
      },
      subtitle2: {
        fontSize: '0.8125rem', // 13px
        lineHeight: 1.35,
        fontWeight: 600,
        color: '#1e293b',
      },
      body1: {
        fontSize: '0.875rem', // 14px
        lineHeight: 1.45,
        fontWeight: 400,
        color: '#334155',
      },
      body2: {
        fontSize: '0.8125rem', // 13px
        lineHeight: 1.4,
        fontWeight: 400,
        color: '#475569',
      },
      caption: {
        fontSize: '0.75rem', // 12px
        lineHeight: 1.3,
        fontWeight: 500,
        color: '#64748b',
      },
      overline: {
        fontSize: '0.6875rem', // 11px
        lineHeight: 1.25,
        fontWeight: 700,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        color: '#64748b',
      },
      button: {
        fontSize: '0.8125rem', // 13px
        lineHeight: 1.3,
        fontWeight: 600,
        textTransform: 'none',
      },
    },
    shape: {
      borderRadius: 10,
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: '#f8fafc',
            fontFeatureSettings: '"cv02", "cv03", "cv04", "cv11"',
            textRendering: 'optimizeLegibility',
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
          },
          '.font-mono': {
            fontFamily: MONO_FONT_FAMILY,
            fontFeatureSettings: '"tnum"',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            boxShadow: 'none',
            borderRadius: 8,
            fontWeight: 600,
            fontSize: '0.8125rem',
            padding: '6px 14px',
            minHeight: 36,
            textTransform: 'none',
            '&:hover': {
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.08)',
            },
          },
          outlined: {
            borderColor: '#e2e8f0',
            color: '#334155',
            backgroundColor: '#ffffff',
            '&:hover': {
              borderColor: '#cbd5e1',
              backgroundColor: '#f8fafc',
            },
          },
          containedPrimary: {
            backgroundColor: '#0284c7',
            '&:hover': {
              backgroundColor: '#0369a1',
            },
          },
          sizeSmall: {
            fontSize: '0.75rem',
            padding: '4px 10px',
            minHeight: 30,
          },
          sizeLarge: {
            fontSize: '0.875rem',
            padding: '8px 18px',
            minHeight: 40,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.02)',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            backgroundImage: 'none',
            backgroundColor: '#ffffff',
          },
        },
      },
      MuiTable: {
        styleOverrides: {
          root: {
            fontFeatureSettings: '"tnum"',
          },
        },
      },
      MuiTableHead: {
        styleOverrides: {
          root: {
            backgroundColor: '#ffffff',
            '& .MuiTableCell-head': {
              fontSize: '0.75rem', // 12px
              fontWeight: 600,
              lineHeight: 1.35,
              letterSpacing: '0.01em',
              textTransform: 'none',
              whiteSpace: 'nowrap',
              color: '#475569',
              padding: '10px 14px',
              borderBottom: '1px solid #e2e8f0',
              userSelect: 'none',
            },
          },
        },
      },
      MuiTableSortLabel: {
        styleOverrides: {
          root: {
            whiteSpace: 'nowrap',
            fontWeight: 600,
            fontSize: '0.75rem',
            color: '#475569',
            '&:hover': {
              color: '#0f172a',
            },
            '&.Mui-active': {
              color: '#0284c7',
              fontWeight: 700,
              '& .MuiTableSortLabel-icon': {
                color: '#0284c7 !important',
              },
            },
          },
          icon: {
            fontSize: 16,
            marginLeft: 4,
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            fontSize: '0.8125rem', // 13px
            lineHeight: 1.4,
            padding: '12px 14px',
            borderBottom: '1px solid #f8fafc',
            color: '#334155',
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            height: 20,
            fontSize: '0.6875rem', // 11px
            fontWeight: 600,
            borderRadius: 4,
            fontFeatureSettings: '"tnum"',
          },
          sizeSmall: {
            height: 18,
            fontSize: '0.625rem', // 10px
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            fontSize: '0.75rem', // 12px
            fontWeight: 600,
            textTransform: 'none',
            minHeight: 36,
            padding: '6px 12px',
          },
        },
      },
      MuiInputBase: {
        styleOverrides: {
          root: {
            fontSize: '0.78125rem', // 12.5px
          },
          input: {
            padding: '6px 10px',
          },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: {
            fontSize: '0.75rem',
          },
        },
      },
    },
  },
  ruRU
);
