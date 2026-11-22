import { getDashboardData } from '@/app/actions/dashboard';
import { MerchantAnalytics } from './merchant-analytics';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <MerchantAnalytics
      lojista={data.lojista}
      whatsappStatus={data.whatsappStatus}
      kpis={data.kpis}
      evolucao14Dias={data.evolucao14Dias}
      canais={data.canais}
      ocupacao={data.ocupacao}
      topServicos={data.topServicos}
      topProfissionais={data.topProfissionais}
      agendamentosHoje={data.agendamentosHoje}
    />
  );
}