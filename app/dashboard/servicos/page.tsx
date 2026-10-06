import { getServicosData } from '@/app/actions/dashboard';
import { ServicosForm } from './servicos-form';

export default async function ServicosPage() {
  const { servicos } = await getServicosData();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Serviços</h2>
          <p className="text-sm text-slate-500">Gerencie os serviços oferecidos e seus tempos de duração.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Formulário Adicionar */}
        <div className="col-span-1 rounded-xl border border-slate-200 bg-white p-6 shadow-sm h-fit">
          <h3 className="mb-4 text-lg font-bold text-slate-900">Novo Serviço</h3>
          <ServicosForm />
        </div>

        {/* Lista de Serviços */}
        <div className="col-span-1 lg:col-span-2 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-bold text-slate-900">Serviços Ativos</h3>
          
          <div className="space-y-3">
            {!servicos || servicos.length === 0 ? (
              <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50">
                <p className="text-sm text-slate-500">Nenhum serviço cadastrado.</p>
              </div>
            ) : (
              servicos.map((servico: any) => (
                <div key={servico.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-4 transition-all hover:bg-slate-50">
                  <div>
                    <h4 className="font-semibold text-slate-900">{servico.nome_servico}</h4>
                    <p className="text-sm text-slate-500">
                      Duração: <span className="font-medium text-slate-700">{servico.duracao_minutos} min</span>
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="font-bold tabular-nums text-slate-900">
                      R$ {servico.preco.toFixed(2).replace('.', ',')}
                    </span>
                    <span className={`inline-flex h-6 w-12 items-center rounded-full px-1 ${servico.ativo ? 'bg-green-500 justify-end' : 'bg-slate-300 justify-start'}`}>
                      <span className="h-4 w-4 rounded-full bg-white shadow-sm" />
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
