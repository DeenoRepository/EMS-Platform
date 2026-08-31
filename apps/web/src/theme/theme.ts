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
        main: '#1d4ed8', // Corporate blue 700
        light: '#dbeafe', // Corporate blue 100 — selected surfaces
        dark: '#1e3a8a', // Corporate blue 900
        contrastText: '#ffffff',
      },
      secondary: {
        main: '#0f766e', // Teal 700 — operational accent
        light: '#ccfbf1',
        dark: '#115e59',
        contrastText: '#ffffff',
      },
      background: {
        default: '#f4f7fb', // Cool application canvas
        paper: '#ffffff',
      },
      text: {
        primary: '#172033', // Navy slate — high contrast
        secondary: '#526176',
        disabled: '#7b8798',
      },
      success: {
        main: '#15803d',
        light: '#dcfce7',
        dark: '#166534',
      },
      warning: {
        main: '#b45309',
        light: '#fef3c7',
        dark: '#92400e',
      },
      error: {
        main: '#b91c1c',
        light: '#fee2e2',
        dark: '#991b1b',
      },
      info: {
        main: '#1d4ed8',
        light: '#dbeafe',
        dark: '#1e3a8a',
      },
      divider: '#dbe3ef',
    },
    typography: {
      fontFamily: SANS_FONT_FAMILY,
      h1: {
        fontSize: '1.625rem', // 26px
        lineHeight: 1.2,
        fontWeight: 800,
        letterSpacing: '-0.025em',
        color: '#172033',
      },
      h2: {
        fontSize: '1.375rem', // 22px
        lineHeight: 1.25,
        fontWeight: 700,
        letterSpacing: '-0.02em',
        color: '#172033',
      },
      h3: {
        fontSize: '1.125rem', // 18px
        lineHeight: 1.3,
        fontWeight: 700,
        color: '#172033',
      },
      h4: {
        fontSize: '1rem', // 16px
        lineHeight: 1.35,
        fontWeight: 600,
        color: '#172033',
      },
      h5: {
        fontSize: '0.875rem', // 14px
        lineHeight: 1.35,
        fontWeight: 600,
        color: '#172033',
      },
      h6: {
        fontSize: '0.8125rem', // 13px
        lineHeight: 1.35,
        fontWeight: 600,
        color: '#172033',
      },
      subtitle1: {
        fontSize: '0.875rem', // 14px
        lineHeight: 1.4,
        fontWeight: 600,
        color: '#172033',
      },
      subtitle2: {
        fontSize: '0.8125rem', // 13px
        lineHeight: 1.35,
        fontWeight: 600,
        color: '#243149',
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
        color: '#526176', // Muted navy for WCAG AA
      },
      overline: {
        fontSize: '0.6875rem', // 11px
        lineHeight: 1.25,
        fontWeight: 700,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        color: '#526176',
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
            backgroundColor: '#f4f7fb',
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
            borderColor: '#cbd5e1',
            color: '#334155',
            backgroundColor: '#ffffff',
            '&:hover': {
              borderColor: '#93c5fd',
              backgroundColor: '#f8fafc',
            },
          },
          containedPrimary: {
            backgroundColor: '#1d4ed8',
            '&:hover': {
              backgroundColor: '#1e3a8a',
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
            boxShadow: '0 1px 3px 0 rgba(23, 32, 51, 0.04)',
            border: '1px solid #dbe3ef',
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
            backgroundColor: '#fbfcfe',
            '& .MuiTableCell-head': {
              fontSize: '0.75rem', // 12px
              fontWeight: 600,
              lineHeight: 1.35,
              letterSpacing: '0.01em',
              textTransform: 'none',
              whiteSpace: 'nowrap',
              color: '#526176',
              padding: '10px 14px',
              borderBottom: '1px solid #dbe3ef',
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
            color: '#526176',
            '&:hover': {
              color: '#172033',
            },
            '&.Mui-active': {
              color: '#1d4ed8',
              fontWeight: 700,
              '& .MuiTableSortLabel-icon': {
                color: '#1d4ed8 !important',
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
            borderBottom: '1px solid #eef2f7',
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
      MuiTextField: {
        defaultProps: {
          size: 'small',
        },
      },
      MuiInputBase: {
        styleOverrides: {
          root: {
            fontSize: '0.875rem',
          },
          sizeSmall: {
            fontSize: '0.8125rem',
          },
        },
      },
      MuiOutlinedInput: {
        defaultProps: {
          size: 'small',
        },
        styleOverrides: {
          root: {
            borderRadius: 8,
            backgroundColor: '#ffffff',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: '#cbd5e1',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: '#93c5fd',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#1d4ed8',
              borderWidth: '1.5px',
            },
          },
          input: {
            fontSize: '0.875rem',
            color: '#172033',
            '&::placeholder': {
              color: '#7b8798',
              opacity: 1,
            },
          },
          inputSizeSmall: {
            fontSize: '0.8125rem',
          },
        },
      },
      MuiInputLabel: {
        defaultProps: {
          size: 'small',
        },
        styleOverrides: {
          root: {
            color: '#526176',
            fontSize: '0.875rem',
            '&.Mui-focused': {
              color: '#1d4ed8',
            },
            '&.MuiInputLabel-shrink': {
              backgroundColor: '#ffffff',
              padding: '0 6px',
              marginLeft: '-3px',
              borderRadius: '3px',
              zIndex: 2,
            },
          },
          sizeSmall: {
            fontSize: '0.8125rem',
            '&.MuiInputLabel-shrink': {
              fontSize: '0.75rem',
              backgroundColor: '#ffffff',
              padding: '0 6px',
              marginLeft: '-3px',
              borderRadius: '3px',
              zIndex: 2,
            },
          },
        },
      },
    },
  },
  ruRU
);
