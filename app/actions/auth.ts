'use server';

import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function login(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'O e-mail e a senha são obrigatórios.' };
  }

  const supabase = await createClient();

  const { error, data: authData } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: 'Credenciais inválidas. Tente novamente.' };
  }

  // Obter o perfil do usuário para redirecionar para a rota correta
  if (authData.user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .single();

    if (
      profile?.role === 'super_admin' ||
      profile?.role === 'superadmin' ||
      profile?.role === 'admin'
    ) {
      redirect('/superadmin');
    }
  }

  redirect('/dashboard');
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const cookieStore = await cookies();
  cookieStore.delete('flow_impersonate_tenant_id');

  redirect('/login');
}
