import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};

export async function middleware(req: NextRequest) {
  let response = NextResponse.next({
    request: { headers: req.headers },
  });

  // Atualização de sessão Supabase
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: req.headers } });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  await supabase.auth.getUser();

  const url = req.nextUrl;
  const path = url.pathname;
  const rawHost = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'flowagenda.online';
  const domain = rawHost.replace(/:\d+$/, '');
  const currentHost = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'flowagenda.online').replace(/:\d+$/, '');

  // 1. admin / app -> /app
  if (domain === `admin.${currentHost}` || domain === `app.${currentHost}`) {
    return NextResponse.rewrite(new URL(`/app${path}`, req.url), {
      headers: response.headers,
    });
  }

  // 2. Home institucional / Localhost -> /home
  if (
    domain === currentHost ||
    domain === `www.${currentHost}` ||
    domain === 'localhost' ||
    domain === '127.0.0.1'
  ) {
    return NextResponse.rewrite(new URL(`/home${path}`, req.url), {
      headers: response.headers,
    });
  }

  // 3. Subdomínio Wildcard (*.flowagenda.online) -> /tenant/[slug]
  if (domain.endsWith(`.${currentHost}`)) {
    const subdomain = domain.replace(`.${currentHost}`, '');
    return NextResponse.rewrite(new URL(`/tenant/${subdomain}${path}`, req.url), {
      headers: response.headers,
    });
  }

  // 4. Domínio Próprio Customizado -> /tenant/custom_[domain]
  return NextResponse.rewrite(new URL(`/tenant/custom_${domain}${path}`, req.url), {
    headers: response.headers,
  });
}
