import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

export interface SuperAdminAuthResult {
  authorized: boolean;
  userId?: string;
  email?: string;
}

export async function verifySuperAdminSession(): Promise<SuperAdminAuthResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { authorized: false };
    }

    const dbClient = process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createAdminClient()
      : (supabase as any);

    const { data: profile } = await dbClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const isSuperAdmin =
      profile?.role === 'super_admin' ||
      profile?.role === 'superadmin' ||
      profile?.role === 'admin';

    if (!isSuperAdmin) {
      return { authorized: false };
    }

    return {
      authorized: true,
      userId: user.id,
      email: user.email,
    };
  } catch {
    return { authorized: false };
  }
}
