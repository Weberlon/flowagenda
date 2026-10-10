import { getClientesData } from '@/app/actions/clientes';
import { ClientesClient } from './clientes-client';

export const dynamic = 'force-dynamic';

export default async function ClientesPage() {
  const data = await getClientesData();

  return (
    <ClientesClient
      lojista={data.lojista}
      initialClientes={data.clientes}
      kpis={data.kpis}
    />
  );
}
