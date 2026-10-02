export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <nav className="border-b bg-white p-4 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-800">FlowAgenda - Painel do Lojista</h2>
      </nav>
      <main className="flex-1 p-6">
        {children}
      </main>
    </div>
  );
}
