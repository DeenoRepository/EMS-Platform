import { createTheme } from '@mui/material/styles';
import { ruRU } from '@mui/material/locale';

export const theme = createTheme(
  {
    palette: {
      mode: 'light',
      primary: {
        main: '#0284c7', // Sky-600 / Industrial blue
        light: '#38bdf8',
        dark: '#0369a1',
        contrastText: '#ffffff',
      },
      secondary: {
        main: '#0f766e', // Teal
        light: '#14b8a6',
        dark: '#115e59',
        contrastText: '#ffffff',
      },
      background: {
        default: '#f8fafc', // Slate-50
        paper: '#ffffff',
      },
      text: {
        primary: '#0f172a', // Slate-900
        secondary: '#475569', // Slate-600
      },
      success: {
        main: '#16a34a',
        light: '#dcfce7',
      },
      warning: {
        main: '#d97706',
        light: '#fef3c7',
      },
      error: {
        main: '#dc2626',
        light: '#fee2e2',
      },
      info: {
        main: '#2563eb',
        light: '#dbeafe',
      },
      divider: '#e2e8f0',
    },
    typography: {
      fontFamily: [
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        'Roboto',
        '"Helvetica Neue"',
        'Arial',
        'sans-serif',
      ].join(','),
      h5: {
        fontWeight: 600,
        fontSize: '1.25rem',
      },
      h6: {
        fontWeight: 600,
        fontSize: '1rem',
      },
      subtitle1: {
        fontWeight: 500,
      },
      button: {
        textTransform: 'none',
        fontWeight: 500,
      },
    },
    shape: {
      borderRadius: 8,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            boxShadow: 'none',
            '&:hover': {
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: '#ffffff',
            color: '#0f172a',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            borderBottom: '1px solid #e2e8f0',
          },
        },
      },
    },
  },
  ruRU
);
