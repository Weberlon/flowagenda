import Link from 'next/link';
import HeroSection from '@/components/landing/HeroSection';
import HowItWorks from '@/components/landing/HowItWorks';
import BentoShowcase from '@/components/landing/BentoShowcase';
import NicheShowcase from '@/components/landing/NicheShowcase';
import TestimonialsSection from '@/components/landing/TestimonialsSection';
import PricingTiers from '@/components/landing/PricingTiers';
import FaqAccordion from '@/components/landing/FaqAccordion';
import FinalCta from '@/components/landing/FinalCta';
import Footer from '@/components/landing/Footer';
import { BrandLogo } from '@/components/BrandLogo';
import { CONTACT_CONFIG } from '@/config/contact';
import { createClient } from '@/utils/supabase/server';
import { ShieldCheck, Check } from 'lucide-react';

export const metadata = {
  title: 'FlowAgenda | Secretária IA 24h no WhatsApp para o seu Negócio Local',
  description:
    'Sua agenda cheia e seu negócio no topo do Google. Automação inteligente no WhatsApp para Barbearias, Salões, Clínicas de Estética, Odontologia, Pet Shops e Tatuagem.',
  openGraph: {
    title: 'FlowAgenda | Secretária IA 24h no WhatsApp',
    description:
      'Atendimento autônomo 24/7 no WhatsApp, trava de 10 min com PIN de segurança, lembretes anti no-show e robô de avaliações 5★ no Google Meu Negócio.',
    url: 'https://flowagenda.online',
    siteName: 'FlowAgenda',
    locale: 'pt_BR',
    type: 'website',
  },
};

export const dynamic = 'force-dynamic';

export default async function AppPage() {
  let painelHref: '/dashboard' | '/superadmin' | null = null;
  try {
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

      painelHref =
        profile?.role === 'super_admin' ||
        profile?.role === 'superadmin' ||
        profile?.role === 'admin'
          ? '/superadmin'
          : '/dashboard';
    }
  } catch {
    // Mantém renderização pública mesmo sem sessão
  }

  const whatsappConsultor = CONTACT_CONFIG.getUrl(
    CONTACT_CONFIG.getConsultantMessage()
  );

  return (
    <div className="min-h-screen bg-[#242933] text-[#ECEFF4] font-sans selection:bg-[#88C0D0] selection:text-[#242933] overflow-x-clip">
      
      {/* 1. Header / Navbar Moderna com Glassmorphism Nord */}
      <header className="sticky top-0 z-50 w-full border-b border-[#3B4252]/80 bg-[#242933]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-20 w-full max-w-7xl min-w-0 items-center justify-between gap-2 sm:gap-4 px-3 sm:px-6 lg:px-8">
          
          {/* Logo FlowAgenda */}
          <Link href="/" className="flex shrink-0 items-center gap-2 group whitespace-nowrap">
            <BrandLogo variant="md" className="group-hover:scale-[1.02] transition-transform" />
            <span className="hidden xl:inline-block whitespace-nowrap text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#88C0D0]/10 text-[#88C0D0] border border-[#88C0D0]/30 font-bold">
              Secretária IA
            </span>
          </Link>

          {/* Navegação Principal (linha única garantida) */}
          <nav className="hidden lg:flex min-w-0 items-center gap-4 xl:gap-7 text-xs xl:text-sm font-semibold text-[#D8DEE9] whitespace-nowrap">
            <a href="#como-funciona" className="whitespace-nowrap hover:text-[#88C0D0] transition-colors">Como Funciona</a>
            <a href="#motor" className="whitespace-nowrap hover:text-[#88C0D0] transition-colors">Benefícios</a>
            <a href="#nichos" className="whitespace-nowrap hover:text-[#88C0D0] transition-colors">Nichos</a>
            <a href="#marca-propria" className="whitespace-nowrap hover:text-[#88C0D0] transition-colors">Marca Própria</a>
            <a href="#depoimentos" className="whitespace-nowrap hover:text-[#88C0D0] transition-colors">Depoimentos</a>
            <a href="#planos" className="whitespace-nowrap hover:text-[#88C0D0] transition-colors">Planos & Preços</a>
            <a href="#faq" className="whitespace-nowrap hover:text-[#88C0D0] transition-colors">Dúvidas</a>
          </nav>

          {/* CTAs do Header */}
          <div className="flex shrink-0 items-center gap-2 sm:gap-3 whitespace-nowrap">
            {painelHref ? (
              <Link
                href={painelHref}
                className="whitespace-nowrap rounded-full border border-[#88C0D0]/50 bg-[#2E3440] px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold text-[#88C0D0] hover:bg-[#3B4252] transition-colors"
              >
                Ir para o Painel
              </Link>
            ) : (
              <Link
                href="/login"
                className="whitespace-nowrap text-xs sm:text-sm font-bold text-[#D8DEE9] hover:text-[#ECEFF4] transition-colors px-2 py-1"
              >
                Entrar
              </Link>
            )}
            <a
              href="#planos"
              className="whitespace-nowrap rounded-full bg-[#88C0D0] px-3.5 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-black text-[#242933] shadow-md shadow-[#88C0D0]/20 hover:bg-[#88C0D0]/90 transition-colors"
            >
              Começar Agora
            </a>
          </div>
        </div>
      </header>

      {/* 2. Hero Section com Framer Motion e Mockup Interativo */}
      <HeroSection whatsappConsultorUrl={whatsappConsultor} />

      {/* 3. Como Funciona em 3 Etapas Simples */}
      <HowItWorks />

      {/* 4. Bento Grid Showcase (A Máquina de Faturamento) */}
      <BentoShowcase />

      {/* 5. Destaque de Funcionalidades por Nicho */}
      <NicheShowcase />

      {/* 6. Seção de Destaque "Sua Marca em Primeiro Lugar" (White Label) */}
      <section id="marca-propria" className="py-20 sm:py-28 bg-[#242933] overflow-hidden border-t border-[#3B4252]/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-[#3B4252] bg-gradient-to-br from-[#2E3440] via-[#242933] to-[#1E232A] p-8 sm:p-12 lg:p-16 shadow-2xl relative overflow-hidden">
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-5 text-left">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#88C0D0]/10 text-[#88C0D0] text-xs font-bold border border-[#88C0D0]/30">
                  <ShieldCheck className="h-4 w-4" />
                  Autoridade & Marca Própria (White Label)
                </span>

                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#ECEFF4] tracking-tight leading-tight">
                  Seu cliente vê a <span className="text-[#88C0D0]">sua marca</span>. Não um aplicativo genérico.
                </h2>

                <p className="text-sm sm:text-base text-[#D8DEE9]/90 leading-relaxed font-normal">
                  Esqueça catálogos impessoais que expõem seus concorrentes para o seu próprio cliente. No FlowAgenda, a tela de agendamento adota as suas cores, seu logotipo, sua tipografia e até o seu domínio próprio (<span className="text-[#88C0D0] font-mono font-bold">suaempresa.com.br</span>).
                </p>

                <ul className="space-y-3 pt-2 text-xs sm:text-sm text-[#ECEFF4] font-medium">
                  <li className="flex items-center gap-2.5">
                    <span className="h-5 w-5 rounded-full bg-[#A3BE8C]/20 text-[#A3BE8C] flex items-center justify-center text-xs font-bold">
                      <Check className="h-3 w-3" />
                    </span>
                    <span>Favicon e título na aba do navegador com o nome da sua empresa</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="h-5 w-5 rounded-full bg-[#A3BE8C]/20 text-[#A3BE8C] flex items-center justify-center text-xs font-bold">
                      <Check className="h-3 w-3" />
                    </span>
                    <span>Rodapé exclusivo com os seus direitos autorais, sem marcas de terceiros</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="h-5 w-5 rounded-full bg-[#A3BE8C]/20 text-[#A3BE8C] flex items-center justify-center text-xs font-bold">
                      <Check className="h-3 w-3" />
                    </span>
                    <span>Fotos profissionais e prova social personalizada para o seu segmento</span>
                  </li>
                </ul>
              </div>

              {/* Box Demonstrativo de Marca Própria */}
              <div className="lg:col-span-5 rounded-2xl border border-[#3B4252] bg-[#2E3440] p-6 shadow-xl space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-[#3B4252]">
                  <div className="h-10 w-10 rounded-xl bg-[#88C0D0] text-[#242933] flex items-center justify-center font-black text-sm shadow-md">
                    CL
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#ECEFF4]">Sua Marca em Evidência</p>
                    <p className="text-[10px] text-[#88C0D0] font-mono">suaempresa.com.br</p>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-[#D8DEE9]/80 italic leading-relaxed">
                  <p>
                    &ldquo;O cliente sente que está utilizando uma solução tecnológica proprietária de altíssimo padrão desenvolvida especialmente para o seu espaço.&rdquo;
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-between text-[11px] font-mono text-[#A3BE8C] border-t border-[#3B4252]">
                  <span>Status: 100% White Label</span>
                  <span>🔒 SSL Ativo</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 7. Depoimentos de Lojistas */}
      <TestimonialsSection />

      {/* 8. Seção de Preços (3 Ciclos de Faturamento & Setup Ancorado) */}
      <div id="planos" className="border-t border-[#3B4252]/60 bg-[#242933]">
        <PricingTiers />
      </div>

      {/* 9. FAQ (Perguntas Frequentes) */}
      <FaqAccordion />

      {/* 10. CTA Final de Conversão */}
      <FinalCta whatsappConsultorUrl={whatsappConsultor} />

      {/* 11. Rodapé Institucional Completo */}
      <Footer whatsappConsultorUrl={whatsappConsultor} />
    </div>
  );
}