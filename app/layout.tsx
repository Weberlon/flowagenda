import './globals.css';

export const metadata = {
  title: 'FlowAgenda',
  description: 'Sistema de Agendamento Inteligente',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-slate-50 antialiased font-sans text-slate-900">
        {children}
      </body>
    </html>
  );
}
