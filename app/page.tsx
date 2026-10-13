import Link from 'next/link';
import HeroSection from '@/components/landing/HeroSection';
import BentoShowcase from '@/components/landing/BentoShowcase';
import PricingTiers from '@/components/landing/PricingTiers';
import { getWhatsAppComercialUrl } from '@/lib/contact';

export const metadata = {
  title: 'FlowAgenda | Sua Máquina de Tração Local e Agendamentos no WhatsApp',
  description:
    'Sua agenda cheia e seu negócio no topo do Google. Sem você perder horas no WhatsApp. Automação inteligente com validação de PIN e robô de avaliações 5 estrelas.',
  openGraph: {
    title: 'FlowAgenda | Máquina de Tração Local & Agendamento no WhatsApp',
    description:
      'Atendimento autônomo 24/7 no WhatsApp, trava de 10 min com PIN de segurança, lembretes anti no-show e robô de avaliações 5★ no Google Meu Negócio.',
    url: 'https://flowagenda.online',
    siteName: 'FlowAgenda',
    locale: 'pt_BR',
    type: 'website',
  },
};

export default function AppPage() {
  const whatsappConsultor = getWhatsAppComercialUrl(
    'Olá! Gostaria de ativar o FlowAgenda no meu estabelecimento.'
  );

  return (
    <div className="min-h-screen bg-nord-bg text-nord-text font-sans selection:bg-nord-accent selection:text-nord-bg overflow-x-hidden">
      
      {/* 1. Header / Navbar Moderna com Glassmorphism Nord */}
      <header className="sticky top-0 z-50 w-full glass-nord-header">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          
          {/* Logo FlowAgenda */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-nord-accent to-nord-accent-dark shadow-lg shadow-nord-accent/20 group-hover:scale-105 transition-transform">
              <svg className="h-6 w-6 text-nord-bg font-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-nord-text">FlowAgenda</span>
              <span className="hidden sm:inline-block ml-2 text-[10px] font-mono px-2 py-0.5 rounded-full bg-nord-accent/10 text-nord-accent border border-nord-accent/30 font-bold">
                SwaS Local
              </span>
            </div>
          </Link>

          {/* Navegação Principal */}
          <nav className="hidden md:flex items-center gap-8 text-xs sm:text-sm font-semibold text-nord-muted">
            <a href="#motor" className="hover:text-nord-accent transition-colors">Como Funciona</a>
            <a href="#marca-propria" className="hover:text-nord-accent transition-colors">Marca Própria</a>
            <a href="#planos" className="hover:text-nord-accent transition-colors">Planos & Preços</a>
            <a href="#faq" className="hover:text-nord-accent transition-colors">Dúvidas</a>
          </nav>

          {/* CTAs do Header */}
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/login"
              className="text-xs sm:text-sm font-bold text-nord-muted hover:text-nord-text transition-colors px-2 py-1"
            >
              Entrar
            </Link>
            <a
              href={whatsappConsultor}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-nord-accent px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-black text-nord-bg shadow-md shadow-nord-accent/20 hover:bg-nord-accent/90 transition-all hover:scale-102"
            >
              Começar Agora
            </a>
          </div>
        </div>
      </header>

      {/* 2. Hero Section com Framer Motion e Mockup Interativo */}
      <HeroSection whatsappConsultorUrl={whatsappConsultor} />

      {/* 3. Bento Grid Showcase (A Máquina de Faturamento) */}
      <BentoShowcase />

      {/* 4. Seção de Destaque "Sua Marca em Primeiro Lugar" (White Label) */}
      <section id="marca-propria" className="py-20 sm:py-28 bg-nord-bg/70 overflow-hidden border-t border-nord-border/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-nord-border bg-gradient-to-br from-nord-surface via-nord-bg to-[#1E232A] p-8 sm:p-12 lg:p-16 shadow-2xl relative overflow-hidden">
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-5 text-left">
                <span className="inline-block px-3.5 py-1 rounded-full bg-nord-accent/10 text-nord-accent text-xs font-bold border border-nord-accent/30">
                  🛡️ Autoridade & Marca Própria (White Label)
                </span>

                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-nord-text tracking-tight leading-tight">
                  Seu cliente vê a <span className="text-nord-accent">sua marca</span>. Não um aplicativo genérico.
                </h2>

                <p className="text-sm sm:text-base text-nord-muted/90 leading-relaxed font-normal">
                  Esqueça catálogos impessoais que expõem seus concorrentes para o seu próprio cliente. No FlowAgenda, a tela de agendamento adota as suas cores, seu logotipo, sua tipografia e até o seu domínio próprio (<span className="text-nord-accent font-mono font-bold">suaclinica.com.br</span>).
                </p>

                <ul className="space-y-3 pt-2 text-xs sm:text-sm text-nord-text font-medium">
                  <li className="flex items-center gap-2.5">
                    <span className="h-5 w-5 rounded-full bg-nord-success/20 text-nord-success flex items-center justify-center text-xs font-bold">✓</span>
                    <span>Favicon e título na aba do navegador com o nome da sua empresa</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="h-5 w-5 rounded-full bg-nord-success/20 text-nord-success flex items-center justify-center text-xs font-bold">✓</span>
                    <span>Rodapé exclusivo com os seus direitos autorais, sem marcas de terceiros</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="h-5 w-5 rounded-full bg-nord-success/20 text-nord-success flex items-center justify-center text-xs font-bold">✓</span>
                    <span>Fotos profissionais e prova social personalizada para o seu segmento</span>
                  </li>
                </ul>
              </div>

              {/* Box Demonstrativo de Marca Própria */}
              <div className="lg:col-span-5 rounded-2xl border border-nord-border bg-nord-bg p-6 shadow-xl space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-nord-border">
                  <div className="h-10 w-10 rounded-xl bg-nord-accent text-nord-bg flex items-center justify-center font-black text-sm shadow-md">
                    CL
                  </div>
                  <div>
                    <p className="text-xs font-bold text-nord-text">Sua Marca em Evidência</p>
                    <p className="text-[10px] text-nord-accent font-mono">suaempresa.com.br</p>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-nord-muted/80 italic leading-relaxed">
                  <p>
                    &ldquo;O cliente sente que está utilizando uma solução tecnológica proprietária de altíssimo padrão desenvolvida especialmente para o seu espaço.&rdquo;
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-between text-[11px] font-mono text-nord-success border-t border-nord-border">
                  <span>Status: 100% White Label</span>
                  <span>🔒 SSL Ativo</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 5. Seção de Preços (3 Ciclos de Faturamento & Setup Ancorado) */}
      <div id="planos" className="border-t border-nord-border/60 bg-nord-surface/30">
        <PricingTiers />
      </div>

      {/* 6. FAQ (Perguntas Frequentes) */}
      <section id="faq" className="py-20 sm:py-24 border-t border-nord-border/60 bg-nord-bg">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-nord-accent">
              Tire Suas Dúvidas
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-nord-text">
              Perguntas Frequentes
            </h2>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-nord-border bg-nord-surface/90 p-5 sm:p-6 space-y-2 shadow-sm">
              <h3 className="text-sm sm:text-base font-bold text-nord-text">
                O meu cliente precisa baixar algum aplicativo?
              </h3>
              <p className="text-xs sm:text-sm text-nord-muted/80 leading-relaxed font-normal">
                Não! O cliente clica no link direto pelo WhatsApp e agenda pelo próprio navegador do celular em menos de 30 segundos, sem login cansativo e sem preencher cadastros demorados.
              </p>
            </div>

            <div className="rounded-2xl border border-nord-border bg-nord-surface/90 p-5 sm:p-6 space-y-2 shadow-sm">
              <h3 className="text-sm sm:text-base font-bold text-nord-text">
                Meu número de WhatsApp corre risco de bloqueio?
              </h3>
              <p className="text-xs sm:text-sm text-nord-muted/80 leading-relaxed font-normal">
                Zero risco. Nós operamos com instâncias individuais e isoladas via Evolution API v2, com disparos estritamente transacionais (respostas solicitadas pelo cliente, PIN de confirmação e lembretes prévios). Nunca realizamos spam em massa.
              </p>
            </div>

            <div className="rounded-2xl border border-nord-border bg-nord-surface/90 p-5 sm:p-6 space-y-2 shadow-sm">
              <h3 className="text-sm sm:text-base font-bold text-nord-text">
                Como funciona o pagamento dos atendimentos?
              </h3>
              <p className="text-xs sm:text-sm text-nord-muted/80 leading-relaxed font-normal">
                Seus clientes pagam diretamente para você no momento do atendimento (Pix, Cartão ou Dinheiro). O FlowAgenda não cobra nenhuma comissão ou porcentagem sobre os seus cortes ou consultas.
              </p>
            </div>

            <div className="rounded-2xl border border-nord-border bg-nord-surface/90 p-5 sm:p-6 space-y-2 shadow-sm">
              <h3 className="text-sm sm:text-base font-bold text-nord-text">
                Como funciona a taxa de implantação/setup?
              </h3>
              <p className="text-xs sm:text-sm text-nord-muted/80 leading-relaxed font-normal">
                Nossa equipe configura sua tabela de horários, cadastra seus serviços, personaliza a sua página com suas cores e conecta seu robô de WhatsApp. No plano Anual, o Setup é 100% GRÁTIS!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Rodapé Institucional Minimalista */}
      <footer className="border-t border-nord-border bg-nord-surface py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-nord-muted/70">
          <div className="flex items-center gap-2">
            <span className="font-bold text-nord-text">FlowAgenda</span>
            <span>• Máquina de Tração Local & Agendamento Autônomo no WhatsApp</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/login" className="hover:text-nord-accent transition-colors font-medium">
              Painel do Lojista
            </Link>
            <a
              href={whatsappConsultor}
              target="_blank"
              rel="noreferrer"
              className="hover:text-nord-accent transition-colors font-medium"
            >
              Falar com Consultor
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
