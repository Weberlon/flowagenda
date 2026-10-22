import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * ==============================================================================
 * FlowAgenda — Roteamento Dinâmico Multi-Tenant via Subdomínios (Edge Runtime)
 * Arquivo: middleware.ts
 * ==============================================================================
 */

export const config = {
  matcher: [
    /*
     * Otimização Edge: O middleware NÃO intercepta:
     * 1. Rotas de API, Webhooks e Crons (/api/*)
     * 2. Arquivos estáticos do Next.js (_next/static, _next/image)
     * 3. Favicon, Sitemap, Robots
     * 4. Extensões de arquivos estáticos (.svg, .png, .jpg, .jpeg, .webp, .css, .js)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|webp|css|js)$).*)',
  ],
};

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  let hasSession = false;

  // 1. Manter sessão do Supabase atualizada com cookies SSR
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        hasSession = true;
      }
    } catch {
      // Ignora falhas temporárias na validação remota de auth
    }
  }

  // Checagem de cookies de sessão caso supabase.auth.getUser() não tenha rodado ou como contingência
  if (!hasSession) {
    hasSession = request.cookies
      .getAll()
      .some(
        (c) =>
          (c.name.includes('-auth-token') || c.name.startsWith('sb-')) &&
          Boolean(c.value)
      );
  }

  const url = request.nextUrl;
  const pathname = url.pathname;

  // 1.1 Interceptação e gestão de Impersonação Segura para Super Admin
  if (url.searchParams.has('exit_impersonation')) {
    const redirectRes = NextResponse.redirect(new URL('/superadmin', request.url));
    response.cookies.getAll().forEach((cookie) => {
      redirectRes.cookies.set(cookie.name, cookie.value, cookie);
    });
    redirectRes.cookies.delete('flow_impersonate_tenant_id');
    return redirectRes;
  }

  if (url.searchParams.has('impersonate_tenant_id')) {
    const tenantId = url.searchParams.get('impersonate_tenant_id');
    if (tenantId) {
      const cleanUrl = new URL(request.url);
      cleanUrl.searchParams.delete('impersonate_tenant_id');
      const redirectRes = NextResponse.redirect(cleanUrl);
      response.cookies.getAll().forEach((cookie) => {
        redirectRes.cookies.set(cookie.name, cookie.value, cookie);
      });
      redirectRes.cookies.set('flow_impersonate_tenant_id', tenantId, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      });
      return redirectRes;
    }
  }

  // 2. Obter hostname da requisição (considerando proxies/Vercel)
  const host =
    request.headers.get('x-forwarded-host') ||
    request.headers.get('host') ||
    '';

  // Remover a porta se existir (ex: localhost:3000 -> localhost)
  const hostname = host.split(':')[0].toLowerCase();

  // 3. Vercel Preview: se terminar em .vercel.app, preserve o roteamento padrão
  if (hostname.endsWith('.vercel.app')) {
    return response;
  }

  // 4. Isolar o subdomínio considerando Produção e Desenvolvimento Local
  const rootDomain = (
    process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'flowagenda.online'
  )
    .toLowerCase()
    .split(':')[0];

  let subdomain: string | null = null;

  if (hostname.endsWith(`.${rootDomain}`)) {
    // Produção: *.flowagenda.online (ex: app.flowagenda.online ou barbearia.flowagenda.online)
    subdomain = hostname.replace(`.${rootDomain}`, '');
  } else if (hostname.endsWith('.localhost')) {
    // Desenvolvimento Local: *.localhost:3000 (ex: app.localhost ou barbearia.localhost)
    subdomain = hostname.replace('.localhost', '');
  }

  // Helper para preservar cookies de sessão em rewrites
  const createRewrite = (targetUrl: URL) => {
    const rewriteRes = NextResponse.rewrite(targetUrl, {
      request: { headers: request.headers },
    });
    response.cookies.getAll().forEach((cookie) => {
      rewriteRes.cookies.set(cookie.name, cookie.value, cookie);
    });
    return rewriteRes;
  };

  // 5. Regras de Roteamento:

  // 5.1 Domínio principal (flowagenda.online, www.flowagenda.online ou localhost:3000 sem subdomínio):
  // Sirva a rota principal de Marketing (/) ou rotas globais do sistema (/login, /superadmin, /dashboard)
  if (!subdomain || subdomain === 'www') {
    return response;
  }

  // 5.2 Subdomínio app (app.flowagenda.online ou app.localhost:3000):
  if (subdomain === 'app') {
    if (pathname === '/') {
      const redirectPath = hasSession ? '/dashboard' : '/login';
      const redirectRes = NextResponse.redirect(
        new URL(`${redirectPath}${url.search}`, request.url)
      );
      response.cookies.getAll().forEach((cookie) => {
        redirectRes.cookies.set(cookie.name, cookie.value, cookie);
      });
      return redirectRes;
    }

    // Se já for uma rota específica (/login, /dashboard, /agenda, etc.), segue diretamente
    return response;
  }

  // 5.3 Subdomínio de lojista ({slug}.flowagenda.online ou {slug}.localhost:3000):
  // Faça rewrite interno para /loja/[slug], injetando o slug extraído
  const lojistaPath =
    pathname === '/'
      ? `/loja/${subdomain}`
      : `/loja/${subdomain}${pathname}`;
  return createRewrite(new URL(`${lojistaPath}${url.search}`, request.url));
}
