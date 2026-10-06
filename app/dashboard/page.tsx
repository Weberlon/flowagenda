import { getDashboardData } from '@/app/actions/dashboard';
import Image from 'next/image';

export default async function DashboardPage() {
  const { agendamentos, whatsappStatus } = await getDashboardData();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* WhatsApp Connection Module */}
        <div className="col-span-1 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-bold text-slate-900">Conexão WhatsApp</h3>
          <div className="flex flex-col items-center justify-center space-y-4">
            {whatsappStatus?.state === 'open' ? (
              <div className="flex flex-col items-center space-y-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-700">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="font-medium text-green-700">Conectado</span>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-4 text-center">
                <span className="font-medium text-amber-600">Aguardando Leitura</span>
                {whatsappStatus?.qrcode ? (
                  <div className="rounded-lg border-2 border-dashed border-slate-200 p-2">
                    <img 
                      src={whatsappStatus.qrcode} 
                      alt="QR Code WhatsApp" 
                      className="h-48 w-48 object-contain"
                    />
                  </div>
                ) : (
                  <div className="h-48 w-48 animate-pulse rounded-lg bg-slate-100" />
                )}
                <p className="text-xs text-slate-500">
                  Escaneie o QR Code no seu WhatsApp para conectar o robô de agendamentos.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Agenda View */}
        <div className="col-span-1 md:col-span-2 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Agenda de Hoje</h3>
            <span className="text-sm text-slate-500">{new Date().toLocaleDateString('pt-BR')}</span>
          </div>

          <div className="space-y-3">
            {!agendamentos || agendamentos.length === 0 ? (
              <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50">
                <p className="text-sm text-slate-500">Nenhum agendamento para hoje.</p>
              </div>
            ) : (
              agendamentos.map((agendamento: any) => {
                const horaInicio = new Date(agendamento.data_hora_inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                const horaFim = new Date(agendamento.data_hora_fim).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                
                const isPendente = agendamento.status === 'pendente_pin';
                const statusColor = isPendente ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-blue-50 text-blue-800 border-blue-200';

                return (
                  <div key={agendamento.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-center space-x-4">
                      <div className="flex w-20 flex-col items-center justify-center border-r border-slate-100 pr-4">
                        <span className="text-lg font-bold tabular-nums text-slate-900">{horaInicio}</span>
                        <span className="text-xs tabular-nums text-slate-500">{horaFim}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{agendamento.cliente?.nome || 'Cliente em confirmação'}</p>
                        <p className="text-sm text-slate-500">{agendamento.servico?.nome_servico || 'Serviço'} • {agendamento.servico?.duracao_minutos} min</p>
                      </div>
                    </div>
                    <div>
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusColor}`}>
                        {isPendente ? 'Aguardando PIN' : 'Confirmado'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
