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

    await supabase.auth.getUser();
  }

  const url = request.nextUrl;
  const pathname = url.pathname;

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

  // 5. Regras de Roteamento (Rewrite interno):

  // 5.1 Domínio principal (flowagenda.online, www.flowagenda.online ou localhost:3000 sem subdomínio):
  // Sirva a rota principal de Marketing (/) ou rotas globais do sistema (/login, /superadmin, /dashboard)
  if (!subdomain || subdomain === 'www') {
    return response;
  }

  // 5.2 Subdomínio app (app.flowagenda.online ou app.localhost:3000):
  // Faça rewrite interno para /app/dashboard
  if (subdomain === 'app') {
    const appPath =
      pathname === '/'
        ? '/app/dashboard'
        : `/app/dashboard${pathname}`;
    return createRewrite(new URL(`${appPath}${url.search}`, request.url));
  }

  // 5.3 Subdomínio de lojista ({slug}.flowagenda.online ou {slug}.localhost:3000):
  // Faça rewrite interno para /loja/[slug], injetando o slug extraído
  const lojistaPath =
    pathname === '/'
      ? `/loja/${subdomain}`
      : `/loja/${subdomain}${pathname}`;
  return createRewrite(new URL(`${lojistaPath}${url.search}`, request.url));
}
