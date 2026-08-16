import type { Metadata } from 'next';
import ThemeRegistry from '@/theme/ThemeRegistry';
import { AuthProvider } from '@/lib/auth-client';
import AppLayout from '@/components/layout/AppLayout';
import { SnackbarProvider } from 'notistack';

export const metadata: Metadata = {
  title: 'EMS — Equipment Management System',
  description: 'Промышленная модульная система управления оборудованием',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body>
        <ThemeRegistry>
          <SnackbarProvider maxSnack={3} autoHideDuration={3500} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
            <AuthProvider>
              <AppLayout>{children}</AppLayout>
            </AuthProvider>
          </SnackbarProvider>
        </ThemeRegistry>
      </body>
    </html>
  );
}
