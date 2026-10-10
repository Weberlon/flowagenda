import { getConfiguracoesData } from '@/app/actions/configuracoes';
import { ConfiguracoesClient } from './configuracoes-client';

export const dynamic = 'force-dynamic';

export default async function ConfiguracoesPage() {
  const data = await getConfiguracoesData();

  return (
    <ConfiguracoesClient
      lojista={data.lojista}
      configRobo={data.configRobo}
      initialWhatsappStatus={data.whatsappStatus}
    />
  );
}
