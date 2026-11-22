'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Star, Quote, CheckCircle2 } from 'lucide-react';

interface Testimonial {
  author: string;
  role: string;
  business: string;
  city: string;
  rating: number;
  text: string;
  metric: string;
  avatarText: string;
}

export default function TestimonialsSection() {
  const testimonials: Testimonial[] = [
    {
      author: 'Lucas Prado',
      role: 'Proprietário & Barbeiro Chefe',
      business: 'Prado Imperial Barbearia',
      city: 'São Paulo - SP',
      rating: 5,
      text: 'Antes do FlowAgenda, eu passava as noites de domingo e intervalos de corte respondendo gente no WhatsApp. Agora o robô fecha os horários sozinho, valida com o PIN e os caras chegam na hora certa. Não perco mais cliente pras barbearias do bairro.',
      metric: '+38% clientes aos sábados',
      avatarText: 'LP',
    },
    {
      author: 'Dra. Camila Meireles',
      role: 'Cirurgiã-Dentista & Gestora',
      business: 'Clínica OdontoMeireles',
      city: 'Belo Horizonte - MG',
      rating: 5,
      text: 'O maior pesadelo da clínica odontológica era o paciente confirmar na véspera e sumir no dia. Com a trava de PIN e o lembrete de 2h do FlowAgenda, nosso índice de faltas caiu mais de 80%. O robô transmite extrema seriedade e organização.',
      metric: '-82% no-show (faltas)',
      avatarText: 'CM',
    },
    {
      author: 'Rodrigo Medeiros',
      role: 'Fundador & Esteticista Pet',
      business: 'Pet Care Bichos & Mimos',
      city: 'Rio de Janeiro - RJ',
      rating: 5,
      text: 'Na correria do banho e tosa, é impossível atender telefone ou ficar digitando no WhatsApp com as mãos molhadas. A IA resolveu 100% disso. Os tutores elogiam demais a facilidade de escolher o dia e horário pelo link direto.',
      metric: '+55 agendamentos/semana',
      avatarText: 'RM',
    },
    {
      author: 'Mariana Castilho',
      role: 'Biomédica Esteta',
      business: 'Instituto Castilho Harmonização',
      city: 'Curitiba - PR',
      rating: 5,
      text: 'A funcionalidade de personalização com minha própria marca e as avaliações automáticas 5 estrelas no Google Meu Negócio elevaram minha clínica para o topo das buscas da região. Foi o melhor investimento do ano.',
      metric: 'Top 1 no Google Local',
      avatarText: 'MC',
    },
  ];

  return (
    <section id="depoimentos" className="py-20 sm:py-28 bg-[#242933] border-t border-[#3B4252]/60 overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Cabeçalho */}
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
          <span className="inline-block px-3.5 py-1 rounded-full bg-[#A3BE8C]/10 text-[#A3BE8C] text-xs font-bold border border-[#A3BE8C]/30 mb-4">
            Resultados Comprovados
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#ECEFF4] tracking-tight">
            Quem usa, não volta mais para a{' '}
            <span className="text-[#A3BE8C]">agenda de papel</span>
          </h2>
          <p className="text-sm sm:text-base text-[#D8DEE9]/80 mt-4 leading-relaxed">
            Mais de 140.000 agendamentos concluídos com sucesso em salões, clínicas e barbearias de todo o Brasil.
          </p>
        </div>

        {/* Grid de Depoimentos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {testimonials.map((item, index) => (
            <motion.div
              key={item.author}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="relative rounded-3xl border border-[#3B4252] bg-gradient-to-br from-[#2E3440] to-[#2E3440]/80 p-6 sm:p-8 shadow-xl flex flex-col justify-between hover:border-[#88C0D0]/40 transition-all hover:-translate-y-1"
            >
              <div className="space-y-4">
                {/* Estrelas & Badge */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-[#EBCB8B]">
                    {[...Array(item.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-[#EBCB8B]" />
                    ))}
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-[#A3BE8C] bg-[#A3BE8C]/10 px-2.5 py-1 rounded-full border border-[#A3BE8C]/30">
                    <CheckCircle2 className="h-3 w-3" />
                    {item.metric}
                  </span>
                </div>

                {/* Texto do Depoimento */}
                <p className="text-xs sm:text-sm text-[#ECEFF4] leading-relaxed italic font-normal">
                  &ldquo;{item.text}&rdquo;
                </p>
              </div>

              {/* Autor & Dados do Estabelecimento */}
              <div className="pt-6 mt-6 border-t border-[#3B4252]/60 flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#88C0D0] to-[#81A1C1] text-[#242933] font-bold text-sm shadow-md">
                  {item.avatarText}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#ECEFF4] leading-tight">{item.author}</h3>
                  <p className="text-xs text-[#88C0D0] mt-0.5">{item.business}</p>
                  <p className="text-[11px] text-[#D8DEE9]/60">{item.city} • {item.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Prova Social Global */}
        <div className="mt-12 rounded-2xl border border-[#3B4252] bg-[#2E3440] p-6 text-center shadow-lg">
          <div className="flex flex-wrap items-center justify-around gap-6 text-xs text-[#D8DEE9]/80 font-mono">
            <div>
              <strong className="block text-xl font-bold text-[#ECEFF4] font-sans">99.8%</strong>
              <span>Uptime dos Robôs WhatsApp</span>
            </div>
            <div className="hidden sm:block h-8 w-px bg-[#4C566A]" />
            <div>
              <strong className="block text-xl font-bold text-[#88C0D0] font-sans">&lt; 3s</strong>
              <span>Tempo Médio de Resposta</span>
            </div>
            <div className="hidden sm:block h-8 w-px bg-[#4C566A]" />
            <div>
              <strong className="block text-xl font-bold text-[#A3BE8C] font-sans">10 Min</strong>
              <span>Trava Atômica com PIN</span>
            </div>
            <div className="hidden sm:block h-8 w-px bg-[#4C566A]" />
            <div>
              <strong className="block text-xl font-bold text-[#EBCB8B] font-sans">4.9 / 5.0</strong>
              <span>Avaliação Média dos Lojistas</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}