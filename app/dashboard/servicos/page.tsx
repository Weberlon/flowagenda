import { getServicosData } from '@/app/actions/dashboard';
import { ServicosForm } from './servicos-form';

export default async function ServicosPage() {
  const { servicos } = await getServicosData();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#ECEFF4]">Catálogo de Serviços</h1>
          <p className="text-sm text-[#D8DEE9]/80">
            Gerencie os serviços oferecidos, valores e tempos de duração na grade.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Formulário Adicionar */}
        <div className="col-span-1 rounded-2xl border border-[#3B4252] bg-[#2E3440] p-6 shadow-lg h-fit">
          <h2 className="mb-4 text-base font-bold text-[#ECEFF4] uppercase tracking-wider text-xs">
            Novo Serviço
          </h2>
          <ServicosForm />
        </div>

        {/* Lista de Serviços */}
        <div className="col-span-1 lg:col-span-2 rounded-2xl border border-[#3B4252] bg-[#2E3440] p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-[#ECEFF4] uppercase tracking-wider text-xs">
              Serviços Cadastrados
            </h2>
            <span className="font-mono text-xs font-semibold text-[#88C0D0] bg-[#242933] px-2.5 py-1 rounded-lg border border-[#3B4252]">
              {servicos?.length || 0} ativos
            </span>
          </div>

          <div className="space-y-3">
            {!servicos || servicos.length === 0 ? (
              <div className="flex h-36 flex-col items-center justify-center rounded-xl border border-dashed border-[#3B4252] bg-[#242933]/50 text-center p-6">
                <p className="text-sm font-semibold text-[#ECEFF4]">Nenhum serviço cadastrado</p>
                <p className="text-xs text-[#D8DEE9]/70 mt-1">
                  Cadastre seu primeiro serviço ao lado para disponibilizar horários no agendamento.
                </p>
              </div>
            ) : (
              servicos.map((servico: any) => (
                <div
                  key={servico.id}
                  className="flex items-center justify-between rounded-xl border border-[#3B4252] bg-[#242933]/60 p-4 transition-all hover:bg-[#3B4252]/40"
                >
                  <div>
                    <h3 className="font-semibold text-[#ECEFF4]">{servico.nome_servico}</h3>
                    <p className="text-xs text-[#D8DEE9]/70 mt-0.5">
                      Duração na grade:{' '}
                      <span className="font-mono font-medium text-[#88C0D0]">
                        {servico.duracao_minutos} min
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="font-bold font-mono text-[#ECEFF4] text-base">
                      R$ {servico.preco.toFixed(2).replace('.', ',')}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        servico.ativo
                          ? 'bg-[#A3BE8C]/15 text-[#A3BE8C] border border-[#A3BE8C]/30'
                          : 'bg-[#BF616A]/15 text-[#BF616A] border border-[#BF616A]/30'
                      }`}
                    >
                      {servico.ativo ? 'Ativo' : 'Pausado'}
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