import Link from 'next/link';
import HeroInteractiveMockup from '@/components/landing/HeroInteractiveMockup';
import PricingTiers from '@/components/landing/PricingTiers';

export const metadata = {
  title: 'FlowAgenda | Sua Máquina de Tração Local e Agendamentos no WhatsApp',
  description:
    'Sua agenda cheia e seu negócio no topo do Google. Sem você perder horas no WhatsApp. Automação inteligente com validação de PIN e robô de avaliações 5 estrelas.',
};

export default function AppPage() {
  const whatsappConsultor =
    'https://wa.me/5500000000000?text=' +
    encodeURIComponent('Olá! Gostaria de ativar o FlowAgenda no meu estabelecimento.');

  return (
    <div className="min-h-screen bg-[#1E232A] text-[#ECEFF4] font-sans selection:bg-[#88C0D0] selection:text-[#242933] overflow-x-hidden">
      {/* 1. Header / Navbar Fixa com Estética Nord */}
      <header className="sticky top-0 z-50 w-full border-b border-[#3B4252]/80 bg-[#242933]/90 backdrop-blur-md overflow-hidden">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#88C0D0] to-[#5E81AC] shadow-lg shadow-[#88C0D0]/20">
              <svg className="h-6 w-6 text-[#242933] font-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-[#ECEFF4]">FlowAgenda</span>
              <span className="hidden sm:inline-block ml-2 text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#88C0D0]/10 text-[#88C0D0] border border-[#88C0D0]/30">
                SwaS Local
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-xs sm:text-sm font-semibold text-[#D8DEE9]">
            <a href="#motor" className="hover:text-[#88C0D0] transition-colors">Como Funciona</a>
            <a href="#marca-propria" className="hover:text-[#88C0D0] transition-colors">Marca Própria</a>
            <a href="#planos" className="hover:text-[#88C0D0] transition-colors">Planos & Preços</a>
            <a href="#faq" className="hover:text-[#88C0D0] transition-colors">Dúvidas</a>
          </nav>

          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/login"
              className="text-xs sm:text-sm font-bold text-[#D8DEE9] hover:text-[#ECEFF4] transition-colors px-2 py-1"
            >
              Entrar
            </Link>
            <a
              href={whatsappConsultor}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-[#88C0D0] px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-black text-[#242933] shadow-md shadow-[#88C0D0]/20 hover:bg-[#88C0D0]/90 transition-all hover:scale-102"
            >
              Começar Agora
            </a>
          </div>
        </div>
      </header>

      {/* 2. Hero Section: Máquina de Tração Local */}
      <section className="relative overflow-hidden pt-12 pb-20 sm:pt-16 sm:pb-28 lg:pt-20 lg:pb-32">
        {/* Glow Nord de Fundo */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-[650px] rounded-full bg-[#88C0D0]/10 blur-[150px] pointer-events-none" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center overflow-hidden">
            {/* Coluna Esquerda: Proposta de Valor & Copywriting */}
            <div className="lg:col-span-6 space-y-6 text-center lg:text-left overflow-hidden">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#88C0D0]/30 bg-[#88C0D0]/10 px-3.5 py-1 text-xs font-semibold text-[#88C0D0]">
                <span className="h-2 w-2 rounded-full bg-[#88C0D0] animate-pulse" />
                Máquina de Tração para Comércio Local
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-5xl xl:text-6xl font-black tracking-tight text-[#ECEFF4] leading-[1.12]">
                Sua agenda cheia e seu negócio no topo do Google.{' '}
                <span className="bg-gradient-to-r from-[#88C0D0] via-[#81A1C1] to-[#A3BE8C] bg-clip-text text-transparent">
                  Sem você perder horas no WhatsApp.
                </span>
              </h1>

              <p className="text-sm sm:text-base lg:text-lg text-[#D8DEE9]/80 leading-relaxed max-w-xl mx-auto lg:mx-0">
                O robô do FlowAgenda atende 24h por dia no seu WhatsApp oficial, valida o número do cliente com código PIN em tempo real, elimina faltas com lembretes automáticos e posiciona sua empresa em 1º lugar nas buscas da sua região.
              </p>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 sm:gap-4">
                <a
                  href={whatsappConsultor}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-[#88C0D0] px-7 py-4 text-xs sm:text-sm font-black text-[#242933] shadow-lg shadow-[#88C0D0]/25 hover:bg-[#88C0D0]/90 transition-all hover:scale-102 text-center"
                >
                  <span>Começar Agora</span>
                  <span>&rarr;</span>
                </a>

                <a
                  href="/tenant/barbeariamodelo"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl border border-[#3B4252] bg-[#2E3440]/80 px-6 py-4 text-xs sm:text-sm font-bold text-[#ECEFF4] hover:bg-[#3B4252] hover:text-white transition-all text-center backdrop-blur-xs"
                >
                  <span>Ver Demonstração ao Vivo</span>
                </a>
              </div>

              {/* Indicadores de Confiança */}
              <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-[11px] text-[#D8DEE9]/70 font-medium">
                <span className="flex items-center gap-1.5">
                  <span className="text-[#A3BE8C] font-bold">✓</span> Trava Atômica de 10 min
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="text-[#A3BE8C] font-bold">✓</span> Zero Spams ou Bloqueios
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="text-[#A3BE8C] font-bold">✓</span> 100% Sua Marca
                </span>
              </div>
            </div>

            {/* Coluna Direita: Hero Interactive Mockup com Toggle */}
            <div className="lg:col-span-6 w-full overflow-hidden">
              <HeroInteractiveMockup />
            </div>
          </div>
        </div>
      </section>

      {/* 3. Seção "O Motor de 3 Engrenagens" */}
      <section id="motor" className="py-20 sm:py-28 border-t border-[#3B4252]/60 bg-[#242933]/60 overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 overflow-hidden">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-16 overflow-hidden">
            <span className="text-xs font-bold uppercase tracking-wider text-[#88C0D0]">
              Engenharia SwaS de Alto Desempenho
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#ECEFF4] tracking-tight">
              O Motor de 3 Engrenagens do FlowAgenda
            </h2>
            <p className="text-sm sm:text-base text-[#D8DEE9]/70 leading-relaxed">
              Como transformamos cliques no Google e conversas no WhatsApp em faturamento recorrente para sua empresa:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch overflow-hidden">
            {/* Engrenagem 1 */}
            <div className="rounded-3xl border border-[#3B4252] bg-[#2E3440] p-6 sm:p-8 space-y-4 shadow-xl flex flex-col justify-between overflow-hidden">
              <div className="space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#88C0D0]/10 text-[#88C0D0] font-black text-xl border border-[#88C0D0]/20">
                  1
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-[#ECEFF4]">
                  Atração no Google Meu Negócio
                </h3>
                <p className="text-xs sm:text-sm text-[#D8DEE9]/70 leading-relaxed">
                  Otimizamos sua ficha local para colocar você nas primeiras posições de busca. Nosso robô pós-atendimento dispara o link oficial de avaliação no momento exato de satisfação máxima, acumulando dezenas de avaliações 5 estrelas.
                </p>
              </div>
              <div className="pt-4 border-t border-[#3B4252] text-xs font-semibold text-[#88C0D0] flex items-center gap-1.5">
                <span>+420 buscas por rotas / mês</span>
              </div>
            </div>

            {/* Engrenagem 2 */}
            <div className="rounded-3xl border border-[#3B4252] bg-[#2E3440] p-6 sm:p-8 space-y-4 shadow-xl flex flex-col justify-between overflow-hidden">
              <div className="space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#A3BE8C]/10 text-[#A3BE8C] font-black text-xl border border-[#A3BE8C]/20">
                  2
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-[#ECEFF4]">
                  Presença Digital de Alto Padrão
                </h3>
                <p className="text-xs sm:text-sm text-[#D8DEE9]/70 leading-relaxed">
                  Seu cliente não precisa baixar nenhum app. Ele clica e entra em uma vitrine limpa, ultra-rápida, com suas fotos e serviços. A interface intuitiva permite agendar em menos de 30 segundos, sem barreiras nem fricção.
                </p>
              </div>
              <div className="pt-4 border-t border-[#3B4252] text-xs font-semibold text-[#A3BE8C] flex items-center gap-1.5">
                <span>Página rápida e 100% responsiva</span>
              </div>
            </div>

            {/* Engrenagem 3 */}
            <div className="rounded-3xl border border-[#3B4252] bg-[#2E3440] p-6 sm:p-8 space-y-4 shadow-xl flex flex-col justify-between overflow-hidden">
              <div className="space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EBCB8B]/10 text-[#EBCB8B] font-black text-xl border border-[#EBCB8B]/20">
                  3
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-[#ECEFF4]">
                  Atendimento & PIN no WhatsApp
                </h3>
                <p className="text-xs sm:text-sm text-[#D8DEE9]/70 leading-relaxed">
                  Para blindar o horário reservado, o cliente recebe um PIN de segurança instantâneo no WhatsApp. Além disso, enviamos o lembrete preventivo 2h antes, eliminando o fantasma do no-show e garantindo a cadeira ocupada.
                </p>
              </div>
              <div className="pt-4 border-t border-[#3B4252] text-xs font-semibold text-[#EBCB8B] flex items-center gap-1.5">
                <span>Redução de até 92% nas faltas</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Seção de Destaque "Sua Marca em Primeiro Lugar" (White Label) */}
      <section id="marca-propria" className="py-20 sm:py-28 overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 overflow-hidden">
          <div className="rounded-3xl border border-[#3B4252] bg-gradient-to-br from-[#2E3440] via-[#242933] to-[#1E232A] p-8 sm:p-12 lg:p-16 shadow-2xl overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center overflow-hidden">
              <div className="lg:col-span-7 space-y-5 text-left overflow-hidden">
                <span className="inline-block px-3 py-1 rounded-full bg-[#88C0D0]/10 text-[#88C0D0] text-xs font-bold border border-[#88C0D0]/30">
                  🛡️ Autoridade & Marca Própria (White Label)
                </span>

                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#ECEFF4] tracking-tight leading-tight">
                  Seu cliente vê a <span className="text-[#88C0D0]">sua marca</span>. Não um aplicativo genérico.
                </h2>

                <p className="text-sm sm:text-base text-[#D8DEE9]/80 leading-relaxed">
                  Esqueça plataformas que obrigam seu cliente a ver concorrentes ou que parecem um catálogo impessoal. No FlowAgenda, a tela de agendamento adota as suas cores, seu logotipo, sua tipografia e até o seu domínio próprio (<span className="text-[#88C0D0] font-mono">suaclinica.com.br</span>).
                </p>

                <ul className="space-y-3 pt-2 text-xs sm:text-sm text-[#ECEFF4]">
                  <li className="flex items-center gap-2.5">
                    <span className="h-5 w-5 rounded-full bg-[#A3BE8C]/20 text-[#A3BE8C] flex items-center justify-center text-xs font-bold">✓</span>
                    <span>Favicon e título na aba do navegador com o nome da sua empresa</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="h-5 w-5 rounded-full bg-[#A3BE8C]/20 text-[#A3BE8C] flex items-center justify-center text-xs font-bold">✓</span>
                    <span>Rodapé exclusivo com os seus direitos autorais, sem marcas intrusivas</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="h-5 w-5 rounded-full bg-[#A3BE8C]/20 text-[#A3BE8C] flex items-center justify-center text-xs font-bold">✓</span>
                    <span>Galeria profissional e prova social personalizada para o seu nicho</span>
                  </li>
                </ul>
              </div>

              {/* Box Demonstrativo de Marca Própria */}
              <div className="lg:col-span-5 rounded-2xl border border-[#3B4252] bg-[#242933] p-6 shadow-xl space-y-4 overflow-hidden">
                <div className="flex items-center gap-3 pb-3 border-b border-[#3B4252]">
                  <div className="h-10 w-10 rounded-xl bg-[#88C0D0] text-[#242933] flex items-center justify-center font-black text-sm">
                    CL
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Sua Marca em Evidência</p>
                    <p className="text-[10px] text-[#88C0D0] font-mono">suaempresa.com.br</p>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-[#D8DEE9]/70">
                  <p>
                    &ldquo;O cliente sente que está utilizando uma solução tecnológica proprietária de alto padrão desenvolvida especialmente para o seu espaço.&rdquo;
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-between text-[11px] font-mono text-[#A3BE8C] border-t border-[#3B4252]">
                  <span>Status: 100% White Label</span>
                  <span>🔒 SSL Seguro</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Seção de Preços (Com Seletores de Ciclo: Mensal, Semestral, Anual) */}
      <div id="planos" className="border-t border-[#3B4252]/60 bg-[#242933]/40 overflow-hidden">
        <PricingTiers />
      </div>

      {/* 6. FAQ (Perguntas Frequentes) */}
      <section id="faq" className="py-20 sm:py-24 border-t border-[#3B4252]/60 bg-[#1E232A] overflow-hidden">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-10 overflow-hidden">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#88C0D0]">
              Tire Suas Dúvidas
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-[#ECEFF4]">
              Perguntas Frequentes
            </h2>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-[#3B4252] bg-[#242933] p-5 sm:p-6 space-y-2">
              <h3 className="text-sm sm:text-base font-bold text-[#ECEFF4]">
                O meu cliente precisa baixar algum aplicativo?
              </h3>
              <p className="text-xs sm:text-sm text-[#D8DEE9]/70 leading-relaxed">
                Não! O cliente clica no link direto pelo WhatsApp e agenda pelo próprio navegador do celular em menos de 30 segundos, sem login cansativo e sem preencher cadastros demorados.
              </p>
            </div>

            <div className="rounded-2xl border border-[#3B4252] bg-[#242933] p-5 sm:p-6 space-y-2">
              <h3 className="text-sm sm:text-base font-bold text-[#ECEFF4]">
                Meu número de WhatsApp corre risco de bloqueio?
              </h3>
              <p className="text-xs sm:text-sm text-[#D8DEE9]/70 leading-relaxed">
                Zero risco. Nós operamos com instâncias individuais e isoladas, com disparos estritamente transacionais (respostas solicitadas pelo cliente, PIN de confirmação e lembretes prévios). Nunca realizamos spam em massa.
              </p>
            </div>

            <div className="rounded-2xl border border-[#3B4252] bg-[#242933] p-5 sm:p-6 space-y-2">
              <h3 className="text-sm sm:text-base font-bold text-[#ECEFF4]">
                Como funciona o pagamento dos atendimentos?
              </h3>
              <p className="text-xs sm:text-sm text-[#D8DEE9]/70 leading-relaxed">
                Seus clientes pagam diretamente para você no momento do atendimento (Pix, Cartão ou Dinheiro). O FlowAgenda não cobra nenhuma comissão ou porcentagem sobre os seus cortes ou consultas.
              </p>
            </div>

            <div className="rounded-2xl border border-[#3B4252] bg-[#242933] p-5 sm:p-6 space-y-2">
              <h3 className="text-sm sm:text-base font-bold text-[#ECEFF4]">
                Como funciona a taxa de implantação/setup?
              </h3>
              <p className="text-xs sm:text-sm text-[#D8DEE9]/70 leading-relaxed">
                Nossa equipe configura sua tabela de horários, cadastra seus serviços, personaliza a sua página com suas cores e conecta seu robô de WhatsApp. No plano Anual, o Setup é 100% GRÁTIS!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Rodapé Institucional Minimalista */}
      <footer className="border-t border-[#3B4252] bg-[#1E232A] py-12 overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-[#D8DEE9]/60">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#ECEFF4]">FlowAgenda</span>
            <span>• Máquina de Tração Local & Agendamento Autônomo no WhatsApp</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/login" className="hover:text-[#88C0D0] transition">
              Painel do Lojista
            </Link>
            <a
              href={whatsappConsultor}
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#88C0D0] transition"
            >
              Falar com Consultor
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
