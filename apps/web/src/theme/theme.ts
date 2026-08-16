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
        main: '#0284c7', // Sky-600 / Enterprise Blue
        light: '#38bdf8',
        dark: '#0369a1',
        contrastText: '#ffffff',
      },
      secondary: {
        main: '#0f766e', // Teal-700
        light: '#14b8a6',
        dark: '#115e59',
        contrastText: '#ffffff',
      },
      background: {
        default: '#f8fafc', // Slate-50
        paper: '#ffffff',
      },
      text: {
        primary: '#0f172a', // Slate-900 (High contrast WCAG AAA)
        secondary: '#475569', // Slate-600 (WCAG AA > 7:1 ratio)
        disabled: '#94a3b8', // Slate-400
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
      // Enterprise Typography Scale (Modular Ratio ~1.25 / 1.333, High Density)
      h1: {
        fontSize: '1.5rem', // 24px
        lineHeight: 1.25,
        fontWeight: 700,
        letterSpacing: '-0.025em',
        color: '#0f172a',
      },
      h2: {
        fontSize: '1.25rem', // 20px
        lineHeight: 1.25,
        fontWeight: 700,
        letterSpacing: '-0.02em',
        color: '#0f172a',
      },
      h3: {
        fontSize: '1.125rem', // 18px
        lineHeight: 1.3,
        fontWeight: 600,
        letterSpacing: '-0.015em',
        color: '#0f172a',
      },
      h4: {
        fontSize: '1rem', // 16px
        lineHeight: 1.35,
        fontWeight: 600,
        letterSpacing: '-0.01em',
        color: '#0f172a',
      },
      h5: {
        fontSize: '0.9375rem', // 15px
        lineHeight: 1.35,
        fontWeight: 600,
        color: '#0f172a',
      },
      h6: {
        fontSize: '0.875rem', // 14px
        lineHeight: 1.4,
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
        fontSize: '0.875rem', // 14px (Standard reading & forms)
        lineHeight: 1.45,
        fontWeight: 400,
        color: '#334155',
      },
      body2: {
        fontSize: '0.8125rem', // 13px (Dense tables, lists, cards)
        lineHeight: 1.4,
        fontWeight: 400,
        color: '#475569',
      },
      caption: {
        fontSize: '0.71875rem', // 11.5px (Metadata, hints, badge text)
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
        lineHeight: 1.35,
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
            '&:hover': {
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.08)',
            },
          },
          sizeSmall: {
            fontSize: '0.75rem',
            padding: '4px 10px',
          },
          sizeLarge: {
            fontSize: '0.875rem',
            padding: '8px 18px',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px 0 rgba(0, 0, 0, 0.02)',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            backgroundImage: 'none',
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
            backgroundColor: '#f8fafc',
            '& .MuiTableCell-head': {
              fontSize: '0.75rem', // 12px
              fontWeight: 700,
              lineHeight: 1.3,
              letterSpacing: '0.03em',
              textTransform: 'uppercase',
              color: '#475569',
              padding: '10px 14px',
              borderBottom: '1px solid #e2e8f0',
            },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            fontSize: '0.8125rem', // 13px (Information Density standard)
            lineHeight: 1.4,
            padding: '8px 14px',
            borderBottom: '1px solid #f1f5f9',
            color: '#334155',
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            height: 22,
            fontSize: '0.71875rem',
            fontWeight: 600,
            borderRadius: 6,
            fontFeatureSettings: '"tnum"',
          },
          sizeSmall: {
            height: 20,
            fontSize: '0.6875rem',
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            fontSize: '0.8125rem',
            fontWeight: 600,
            textTransform: 'none',
            minHeight: 44,
            padding: '8px 16px',
          },
        },
      },
      MuiInputBase: {
        styleOverrides: {
          root: {
            fontSize: '0.84375rem', // 13.5px
          },
          input: {
            padding: '8.5px 12px',
          },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: {
            fontSize: '0.84375rem',
          },
        },
      },
    },
  },
  ruRU
);
