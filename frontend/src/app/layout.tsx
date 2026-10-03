import './globals.css';
import { AuthProvider } from '@/context/AuthContext';

export const metadata = {
  title: 'SkillForge — Sandboxed Code Execution Platform',
  description: 'Production-grade coding practice platform with Kubernetes sandboxed execution engine and real-time WebSockets.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
