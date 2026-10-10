import Link from 'next/link';

export default function HomePage() {
  const whatsappConsultor = "https://wa.me/5500000000000?text=Ol%C3%A1!%20Gostaria%20de%20conhecer%20o%20FlowAgenda%20e%20automatizar%20os%20agendamentos%20do%20meu%20estabelecimento.";

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 font-sans selection:bg-emerald-500 selection:text-white">
      {/* 1. Header / Navbar Fixa */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-800/80 bg-[#020617]/80 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 shadow-lg shadow-emerald-500/20">
              <svg className="h-6 w-6 text-slate-950 font-bold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tight text-white">FlowAgenda</span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#como-funciona" className="hover:text-emerald-400 transition-colors">Como Funciona</a>
            <a href="#recursos" className="hover:text-emerald-400 transition-colors">Recursos</a>
            <a href="#planos" className="hover:text-emerald-400 transition-colors">Planos & Preços</a>
            <a href="#faq" className="hover:text-emerald-400 transition-colors">Dúvidas</a>
          </nav>

          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-xs sm:text-sm font-semibold text-slate-300 hover:text-white transition-colors"
            >
              Entrar
            </Link>
            <a
              href={whatsappConsultor}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-950 shadow-md shadow-emerald-500/20 hover:opacity-95 transition-all"
            >
              Falar com Consultor
            </a>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-28 lg:pt-28 lg:pb-36">
        {/* Glow de Fundo */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-[600px] rounded-full bg-emerald-500/10 blur-[140px] pointer-events-none" />

        <div className="relative mx-auto max-w-7xl px-6 lg:px-8 text-center space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold text-emerald-300 backdrop-blur-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Software with a Service (SwaS) para Comércio Local
          </div>

          <h1 className="mx-auto max-w-4xl text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white leading-tight">
            Agendamentos automáticos no WhatsApp que <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">nunca deixam seu cliente esperando.</span>
          </h1>

          <p className="mx-auto max-w-2xl text-base sm:text-lg text-slate-400 leading-relaxed">
            Elimine áudios demorados e desencontros de horário. O robô do FlowAgenda atende 24h por dia no seu WhatsApp, reserva o horário com validação de PIN e atualiza sua agenda em tempo real.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <a
              href={whatsappConsultor}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-xl bg-emerald-500 px-8 py-4 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/25 hover:bg-emerald-400 transition-all hover:scale-102"
            >
              <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.353.101.173.45 0.742.965 1.201.662.591 1.221.774 1.394.86.173.086.275.072.376-.043.101-.116.433-.506.549-.679.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.043.073.043.419-.101.824z" />
              </svg>
              Quero Ativar no Meu Estabelecimento
            </a>

            <a
              href="/tenant/barbeariamodelo"
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-900/60 px-8 py-4 text-sm font-semibold text-white hover:bg-slate-800 transition-all backdrop-blur-xs"
            >
              Testar Loja Modelo ao Vivo &rarr;
            </a>
          </div>

          {/* Mockup Interativo do Atendimento */}
          <div className="pt-12 mx-auto max-w-4xl">
            <div className="rounded-2xl border border-slate-800 bg-[#0B132B]/80 p-6 md:p-8 shadow-2xl backdrop-blur-xl text-left grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              {/* Simulador WhatsApp */}
              <div className="rounded-xl border border-slate-700/60 bg-[#070D1E] p-4 space-y-3 font-sans">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
                  <div className="h-9 w-9 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                    🤖
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Robô FlowAgenda</p>
                    <p className="text-[10px] text-emerald-400">Online • Atendimento 24/7</p>
                  </div>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="bg-[#1E293B] text-slate-200 p-2.5 rounded-lg rounded-tl-none max-w-[85%]">
                    Oi! Gostaria de cortar o cabelo amanhã às 15h.
                  </div>
                  <div className="bg-emerald-950/70 border border-emerald-800/40 text-emerald-100 p-3 rounded-lg rounded-tr-none ml-auto max-w-[90%] space-y-1.5">
                    <p>Olá! 🤖 Para garantir seu horário na <strong>Barbearia Modelo</strong> sem esperar, acesse:</p>
                    <span className="block text-[11px] font-mono text-emerald-300 underline">
                      https://barbeariamodelo.flowagenda.online
                    </span>
                  </div>
                  <div className="bg-emerald-950/70 border border-emerald-800/40 text-emerald-100 p-3 rounded-lg rounded-tr-none ml-auto max-w-[90%]">
                    <p>Seu código PIN de confirmação é: <strong className="text-white font-mono">789565</strong> 🔐</p>
                    <p className="text-[10px] text-emerald-300/80 mt-1">Horário bloqueado por 10 minutos.</p>
                  </div>
                </div>
              </div>

              {/* Destaques Laterais */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-white">O que acontece nos bastidores?</h3>
                <ul className="space-y-3 text-xs text-slate-300">
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 text-xs">✓</span>
                    <span><strong>Resposta Imediata:</strong> O cliente não precisa esperar você terminar um corte ou atendimento para ser respondido.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 text-xs">✓</span>
                    <span><strong>Lock de 10 Minutos com PIN:</strong> Zero concorrência de horários e certeza de que o WhatsApp informado é real.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 text-xs">✓</span>
                    <span><strong>Sincronização com o Painel:</strong> O agendamento cai direto na tela do seu computador ou celular.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Como Funciona (3 Passos) */}
      <section id="como-funciona" className="py-24 border-t border-slate-900 bg-slate-950/40">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-400">Simples & Poderoso</h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Como o FlowAgenda transforma sua rotina</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="rounded-2xl border border-slate-800 bg-[#0F172A]/50 p-8 space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 font-bold text-lg border border-emerald-500/20">
                1
              </div>
              <h3 className="text-lg font-bold text-white">Cliente Envia Mensagem</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Ao mandar um "Oi" no seu WhatsApp comercial, o robô responde instantaneamente com o link personalizado da sua loja.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-[#0F172A]/50 p-8 space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-500/10 text-teal-400 font-bold text-lg border border-teal-500/20">
                2
              </div>
              <h3 className="text-lg font-bold text-white">Escolha em 30 Segundos</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                O cliente escolhe o serviço, o dia e o horário livre. Ele recebe um PIN de 6 dígitos no WhatsApp para travar o horário.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-[#0F172A]/50 p-8 space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 font-bold text-lg border border-cyan-500/20">
                3
              </div>
              <h3 className="text-lg font-bold text-white">Horário Confirmado</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Você recebe a notificação no painel e o cliente recebe uma mensagem de confirmação completa com data, horário e serviço.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Planos & Preços */}
      <section id="planos" className="py-24 border-t border-slate-900">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-400">Previsibilidade Total</h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Planos transparentes. Sem comissões.</p>
            <p className="text-xs text-slate-400">Você não paga porcentagem por agendamento. Paga uma mensalidade fixa e fica com 100% do seu faturamento.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
            {/* Tier 1 */}
            <div className="rounded-2xl border border-slate-800 bg-[#0B132B]/40 p-8 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Tier 1</span>
                <h3 className="text-xl font-bold text-white">Essencial</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-white">R$ 97</span>
                  <span className="text-xs text-slate-400">/mês</span>
                </div>
                <p className="text-xs text-slate-400">Para profissionais autônomos que estão começando a organizar a agenda online.</p>

                <ul className="space-y-2.5 text-xs text-slate-300 pt-4 border-t border-slate-800">
                  <li className="flex items-center gap-2">✓ Subdomínio exclusivo (`slug.flowagenda.online`)</li>
                  <li className="flex items-center gap-2">✓ Agenda Online & Gestão de Serviços</li>
                  <li className="flex items-center gap-2">✓ Base de Clientes Integrada</li>
                  <li className="flex items-center gap-2">✓ Lock de agendamento de 10 min</li>
                </ul>
              </div>

              <a
                href={whatsappConsultor}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full rounded-xl border border-slate-700 bg-slate-900 py-3 text-center text-xs font-bold text-white hover:bg-slate-800 transition"
              >
                Assinar Tier 1
              </a>
            </div>

            {/* Tier 2 (Destaque Pro) */}
            <div className="relative rounded-2xl border-2 border-emerald-500 bg-[#0B1A28] p-8 flex flex-col justify-between space-y-6 shadow-2xl shadow-emerald-500/10">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-4 py-1 text-[11px] font-bold text-slate-950 uppercase tracking-wide">
                Mais Escolhido (SwaS)
              </div>

              <div className="space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Tier 2</span>
                <h3 className="text-xl font-bold text-white">Pro & Robô WhatsApp</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white">R$ 197</span>
                  <span className="text-xs text-slate-400">/mês</span>
                </div>
                <p className="text-xs text-slate-400">A solução completa com o robô de atendimento automático no WhatsApp do seu estabelecimento.</p>

                <ul className="space-y-2.5 text-xs text-slate-200 pt-4 border-t border-slate-800 font-medium">
                  <li className="flex items-center gap-2 text-emerald-300">✓ <strong>Robô de WhatsApp na VPS dedicado</strong></li>
                  <li className="flex items-center gap-2 text-emerald-300">✓ <strong>Disparo de PIN transacional (Zero Faltas)</strong></li>
                  <li className="flex items-center gap-2">✓ Mensagens automáticas de confirmação</li>
                  <li className="flex items-center gap-2">✓ Agendamentos e clientes ilimitados</li>
                  <li className="flex items-center gap-2">✓ Painel de métricas de retenção (VIP/Fiel)</li>
                  <li className="flex items-center gap-2">✓ Suporte prioritário no WhatsApp</li>
                </ul>
              </div>

              <a
                href={whatsappConsultor}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full rounded-xl bg-emerald-500 py-3.5 text-center text-xs font-bold text-slate-950 hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/20"
              >
                Quero o Plano Pro com Robô
              </a>
            </div>

            {/* Tier 3 */}
            <div className="rounded-2xl border border-slate-800 bg-[#0B132B]/40 p-8 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Tier 3</span>
                <h3 className="text-xl font-bold text-white">Institucional & Marca Própria</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-white">R$ 397</span>
                  <span className="text-xs text-slate-400">/mês</span>
                </div>
                <p className="text-xs text-slate-400">Para clínicas e barbearias de alto padrão que exigem domínio próprio e site institucional.</p>

                <ul className="space-y-2.5 text-xs text-slate-300 pt-4 border-t border-slate-800">
                  <li className="flex items-center gap-2">✓ <strong>Tudo incluído no Tier 2 Pro</strong></li>
                  <li className="flex items-center gap-2">✓ <strong>Domínio Próprio (`seunegocio.com.br`)</strong></li>
                  <li className="flex items-center gap-2">✓ Site Institucional Completo com Portfólio</li>
                  <li className="flex items-center gap-2">✓ Provisionamento automático via Vercel API</li>
                  <li className="flex items-center gap-2">✓ Selo White-label exclusivo</li>
                </ul>
              </div>

              <a
                href={whatsappConsultor}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full rounded-xl border border-slate-700 bg-slate-900 py-3 text-center text-xs font-bold text-white hover:bg-slate-800 transition"
              >
                Assinar Tier 3 Institucional
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 5. FAQ (Perguntas Frequentes) */}
      <section id="faq" className="py-24 border-t border-slate-900 bg-slate-950/40">
        <div className="mx-auto max-w-4xl px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-400">Tire Suas Dúvidas</h2>
            <p className="text-3xl font-extrabold text-white">Perguntas Frequentes</p>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-slate-800 bg-[#0F172A]/40 p-6 space-y-2">
              <h3 className="text-sm font-bold text-white">O meu cliente precisa baixar algum aplicativo?</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Não! Essa é a maior vantagem do FlowAgenda: o cliente clica no link direto pelo WhatsApp e agenda pelo próprio navegador do celular em menos de 30 segundos.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#0F172A]/40 p-6 space-y-2">
              <h3 className="text-sm font-bold text-white">Meu número pessoal de WhatsApp corre risco de bloqueio?</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Não. Nós operamos com instâncias individuais e isoladas na VPS, com disparos estritamente transacionais (respostas e PINs). Nunca realizamos spam ou mensagens em massa.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#0F172A]/40 p-6 space-y-2">
              <h3 className="text-sm font-bold text-white">Como funciona o pagamento dos agendamentos?</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Seus clientes pagam diretamente para você no momento do atendimento (Pix, Cartão ou Dinheiro). O FlowAgenda não retém porcentagem nem comissão sobre o seu trabalho.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#0F172A]/40 p-6 space-y-2">
              <h3 className="text-sm font-bold text-white">Existe fidelidade ou multa de cancelamento?</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Zero fidelidade. Você pode cancelar sua assinatura mensal a qualquer momento sem nenhuma taxa ou burocracia.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Footer */}
      <footer className="border-t border-slate-900 bg-[#020617] py-12">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-300">FlowAgenda</span>
            <span>• Automação Inteligente de Agendamentos para Comércio Local</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/login" className="hover:text-slate-300 transition">Painel do Lojista</Link>
            <a href={whatsappConsultor} target="_blank" rel="noreferrer" className="hover:text-slate-300 transition">Suporte Comercial</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
