/**
 * test-utils.tsx — shared render helper for @/components/ui tests.
 *
 * Wraps the component under test with the MUI ThemeProvider so components
 * that use theme.palette.* or sx={{ color: 'primary.main' }} resolve correctly
 * without throwing "Could not find the `ThemeProvider` context".
 */
import React from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

const theme = createTheme({
  palette: {
    mode: 'light',
  },
});

function AllProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}

/**
 * Drop-in replacement for RTL `render` that wraps `ui` in MUI ThemeProvider.
 * Use this for every component test to avoid theme resolution errors.
 */
export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: AllProviders, ...options });
}

// Re-export everything from @testing-library/react so test files only need
// one import: `import { renderWithProviders, screen, fireEvent } from './test-utils'`
export * from '@testing-library/react';
