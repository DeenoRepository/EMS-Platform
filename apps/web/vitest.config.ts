import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/components/ui/__tests__/setup.ts'],
    include: ['src/**/*.test.tsx'],
    globals: true,
    coverage: {
      provider: 'v8',
      enabled: true,
      include: ['src/components/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/__tests__/**',
        'src/**/*.d.ts',
        'src/app/api/**',
      ],
      reporter: ['text', 'json-summary'],
      reportsDirectory: './coverage/components',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
