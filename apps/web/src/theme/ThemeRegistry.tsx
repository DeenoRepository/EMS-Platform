'use client';

import * as React from 'react';
import createCache from '@emotion/cache';
import { useServerInsertedHTML } from 'next/navigation';
import { CacheProvider } from '@emotion/react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import GlobalStyles from '@mui/material/GlobalStyles';
import { theme } from './theme';

export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
  const [{ cache, flush }] = React.useState(() => {
    const cache = createCache({ key: 'mui' });
    cache.compat = true;
    const prevInsert = cache.insert;
    let inserted: string[] = [];
    cache.insert = (...args) => {
      const serialized = args[1];
      if (cache.inserted[serialized.name] === undefined) {
        inserted.push(serialized.name);
      }
      return prevInsert(...args);
    };
    const flush = () => {
      const prevInserted = inserted;
      inserted = [];
      return prevInserted;
    };
    return { cache, flush };
  });

  useServerInsertedHTML(() => {
    const names = flush();
    if (names.length === 0) {
      return null;
    }
    let styles = '';
    for (const name of names) {
      styles += cache.inserted[name];
    }
    return (
      <style
        key={cache.key}
        data-emotion={`${cache.key} ${names.join(' ')}`}
        dangerouslySetInnerHTML={{
          __html: styles,
        }}
      />
    );
  });

  return (
    <CacheProvider value={cache}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <GlobalStyles
          styles={{
            '@media print': {
              '@page': {
                size: 'A4 portrait',
                margin: '10mm 12mm 10mm 12mm',
              },
              'html, body': {
                backgroundColor: `${theme.palette.background.paper} !important`,
                color: `${theme.palette.text.primary} !important`,
                fontSize: '10pt !important',
                WebkitPrintColorAdjust: 'exact !important',
                printColorAdjust: 'exact !important',
                margin: '0 !important',
                padding: '0 !important',
                width: '100% !important',
                minWidth: '100% !important',
              },
              '.no-print, header, nav, aside, .MuiDrawer-root, .MuiTabs-root, .MuiBreadcrumbs-root, .page-header-actions, .MuiAlert-root, .notistack-SnackbarContainer': {
                display: 'none !important',
              },
              'main': {
                width: '100% !important',
                maxWidth: '100% !important',
                margin: '0 !important',
                padding: '0 !important',
                boxSizing: 'border-box !important',
              },
              '.MuiCard-root, .MuiPaper-root': {
                boxShadow: 'none !important',
                border: `1px solid ${theme.palette.divider} !important`,
                pageBreakInside: 'avoid !important',
                breakInside: 'avoid !important',
                marginBottom: '10px !important',
                backgroundColor: `${theme.palette.background.paper} !important`,
              },
              '.MuiGrid-container': {
                width: '100% !important',
                margin: '0 !important',
              },
              '.MuiGrid-item': {
                paddingTop: '6px !important',
                paddingLeft: '6px !important',
              },
              'button, .MuiIconButton-root': {
                display: 'none !important',
              },
              '.print-only': {
                display: 'block !important',
              },
            },
          }}
        />
        {children}
      </ThemeProvider>
    </CacheProvider>
  );
}
