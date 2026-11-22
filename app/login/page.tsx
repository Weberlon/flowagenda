import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { LoginFormClient } from './LoginFormClient';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (
      profile?.role === 'super_admin' ||
      profile?.role === 'superadmin' ||
      profile?.role === 'admin'
    ) {
      redirect('/superadmin');
    }

    redirect('/dashboard');
  }

  return <LoginFormClient />;
}
