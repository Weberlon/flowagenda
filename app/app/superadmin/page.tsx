import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { OnboardingForm } from './onboarding-form';

export default async function SuperAdminPage() {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login'); // Adapte para a rota de login real
  }

  // Validação de Role (super_admin)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'super_admin') {
    return (
      <main className="flex min-h-screen items-center justify-center p-24">
        <div className="rounded-md bg-red-50 p-6 text-red-700">
          <h1 className="text-xl font-bold">Acesso Negado</h1>
          <p>Esta página é restrita a administradores do sistema.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center bg-slate-50 p-8 md:p-24">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Painel Super Admin</h1>
        <p className="mt-2 text-slate-600">Gestão global de Lojistas e Configurações do FlowAgenda.</p>
      </div>
      
      <OnboardingForm />
    </main>
  );
}
