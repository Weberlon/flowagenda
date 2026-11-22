import type { Metadata } from 'next';
import { DemoAgendamentoClient } from './demo-agendamento-client';

export const metadata: Metadata = {
  title: 'Demonstração ao Vivo | FlowAgenda',
  description:
    'Experimente na prática o fluxo de agendamento online com trava de 10 minutos e confirmação por PIN do FlowAgenda.',
};

export default function DemoPage() {
  return <DemoAgendamentoClient />;
}
