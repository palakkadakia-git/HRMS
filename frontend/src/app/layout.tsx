import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';
import QueryProvider from '@/providers/QueryProvider';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'HRMS', template: '%s | HRMS' },
  description: 'Internal HR & Payroll Management System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              duration: 3000,
              style: { fontSize: '0.875rem' },
            }}
          />
        </QueryProvider>
      </body>
    </html>
  );
}
