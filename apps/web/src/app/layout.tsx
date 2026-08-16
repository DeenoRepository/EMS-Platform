import type { Metadata } from 'next';
import ThemeRegistry from '@/theme/ThemeRegistry';
import ClientProviders from '@/components/providers/ClientProviders';

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
          <ClientProviders>{children}</ClientProviders>
        </ThemeRegistry>
      </body>
    </html>
  );
}
