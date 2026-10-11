'use server';

// ==============================================================================
// Server Actions: WhatsApp Integration (Evolution API v2 & Supabase)
// Arquivo: app/actions/whatsapp.ts
// ==============================================================================

import { createClient } from '@/utils/supabase/server';
import { 
  createInstance, 
  fetchQrCode, 
  getConnectionState, 
  deleteInstance, 
  logoutEvolutionInstance,
  sendTextMessage,
  formatToInternationalPhone,
  ConnectionState
} from '@/lib/evolution';
import { revalidatePath } from 'next/cache';

export interface ActionResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface TenantQrCodeData {
  instanceName: string;
  status: ConnectionState;
  qrcode?: string | null;
  pairingCode?: string | null;
  isConnected: boolean;
  phoneNumber?: string | null;
  profileName?: string | null;
}

export interface TenantConnectionData {
  instanceName: string;
  status: ConnectionState;
  isConnected: boolean;
}

/**
 * 1. Gera ou recupera o QR Code de pareamento do tenant (Lojista)
 * Orquestra sessão autenticada, Supabase e Evolution API v2.
 */
export async function generateTenantQrCodeAction(): Promise<ActionResponse<TenantQrCodeData>> {
  try {
    const supabase = await createClient();

    // 1. Valida a sessão do usuário
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Sessão expirada. Faça login novamente para continuar.' };
    }

    // 2. Obtém a organização (lojista) associada ao usuário
    const { data: lojista, error: lojistaError } = await supabase
      .from('lojistas')
      .select('id, nome_estabelecimento')
      .eq('user_id', user.id)
      .single();

    if (lojistaError || !lojista) {
      return { success: false, error: 'Organização não encontrada para o usuário autenticado.' };
    }

    const organizationId = lojista.id;
    const defaultInstanceName = `flow_${organizationId}`;

    // 3. Consulta se a instância já existe registrada no Supabase (whatsapp_instances)
    let instanceRecord: any = null;
    const { data: dbInstance, error: fetchDbError } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (!fetchDbError && dbInstance) {
      instanceRecord = dbInstance;
    }

    const instanceName = instanceRecord?.instance_name || defaultInstanceName;

    // 4. Se não existe no banco, cria a instância na Evolution API v2 e registra no Supabase
    if (!instanceRecord) {
      const creationResult = await createInstance(organizationId);
      if (!creationResult.success) {
        return { 
          success: false, 
          error: creationResult.error || 'Falha ao criar instância no gateway Evolution API.' 
        };
      }

      // Tenta persistir no Supabase (tabela whatsapp_instances)
      const { data: newDbInstance } = await supabase
        .from('whatsapp_instances')
        .insert({
          organization_id: organizationId,
          instance_name: instanceName,
          instance_id: creationResult.data?.instanceId || null,
          status: 'connecting',
        })
        .select()
        .maybeSingle();

      if (newDbInstance) {
        instanceRecord = newDbInstance;
      }

      // Sincroniza também a tabela legada configuracoes_robo se existir
      try {
        await supabase
          .from('configuracoes_robo')
          .upsert(
            {
              lojista_id: organizationId,
              instance_name: instanceName,
              status_conexao: 'connecting',
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'lojista_id' }
          );
      } catch (e) {
        // Ignora silenciosamente se tabela não existir
      }
    }

    // 5. Consulta o status em tempo real da instância
    const stateResult = await getConnectionState(instanceName);
    const currentState: ConnectionState = stateResult.success && stateResult.data 
      ? stateResult.data.state 
      : (instanceRecord?.status || 'disconnected');

    // Se já estiver conectado ('open')
    if (currentState === 'open') {
      try {
        await supabase
          .from('whatsapp_instances')
          .update({ status: 'open', updated_at: new Date().toISOString() })
          .eq('organization_id', organizationId);
      } catch (e) {}

      return {
        success: true,
        data: {
          instanceName,
          status: 'open',
          isConnected: true,
          qrcode: null,
          phoneNumber: instanceRecord?.phone_number || null,
          profileName: instanceRecord?.profile_name || null,
        },
      };
    }

    // 6. Se desconectada ou conectando, busca o QR Code na Evolution API
    const qrResult = await fetchQrCode(instanceName);

    // Atualiza status no banco para 'connecting' se houver QR Code ativo
    const finalStatus: ConnectionState = qrResult.success && qrResult.data?.base64 
      ? 'connecting' 
      : currentState;

    try {
      await supabase
        .from('whatsapp_instances')
        .update({ status: finalStatus, updated_at: new Date().toISOString() })
        .eq('organization_id', organizationId);
    } catch (e) {}

    return {
      success: true,
      data: {
        instanceName,
        status: finalStatus,
        isConnected: false,
        qrcode: qrResult.data?.base64 || null,
        pairingCode: qrResult.data?.pairingCode || null,
      },
    };
  } catch (error: any) {
    console.error('[Action] generateTenantQrCodeAction Error:', error);
    return {
      success: false,
      error: error?.message || 'Erro inesperado ao gerar QR Code do WhatsApp.',
    };
  }
}

/**
 * 2. Consulta o status de conexão da organização e sincroniza o Supabase
 */
export async function checkTenantConnectionAction(): Promise<ActionResponse<TenantConnectionData>> {
  try {
    const supabase = await createClient();

    // 1. Valida a sessão
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Sessão expirada. Faça login novamente.' };
    }

    // 2. Busca a organização (lojista)
    const { data: lojista, error: lojistaError } = await supabase
      .from('lojistas')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (lojistaError || !lojista) {
      return { success: false, error: 'Organização não encontrada.' };
    }

    const organizationId = lojista.id;

    // 3. Obtém o nome da instância registrada
    const { data: instanceRecord } = await supabase
      .from('whatsapp_instances')
      .select('instance_name, status')
      .eq('organization_id', organizationId)
      .maybeSingle();

    const instanceName = instanceRecord?.instance_name || `flow_${organizationId}`;

    // 4. Consulta status em tempo real na Evolution API
    const stateResult = await getConnectionState(instanceName);
    const status: ConnectionState = stateResult.success && stateResult.data 
      ? stateResult.data.state 
      : 'disconnected';

    const isConnected = status === 'open';

    // 5. Atualiza no banco de dados (whatsapp_instances)
    try {
      await supabase
        .from('whatsapp_instances')
        .update({ 
          status, 
          updated_at: new Date().toISOString() 
        })
        .eq('organization_id', organizationId);
    } catch (e) {}

    // Sincroniza também a tabela legada configuracoes_robo se existir
    try {
      await supabase
        .from('configuracoes_robo')
        .update({ 
          status_conexao: status, 
          updated_at: new Date().toISOString() 
        })
        .eq('lojista_id', organizationId);
    } catch (e) {}

    revalidatePath('/dashboard/configuracoes');

    return {
      success: true,
      data: {
        instanceName,
        status,
        isConnected,
      },
    };
  } catch (error: any) {
    console.error('[Action] checkTenantConnectionAction Error:', error);
    return {
      success: false,
      error: error?.message || 'Erro ao consultar status da conexão WhatsApp.',
    };
  }
}

/**
 * 3. Desconecta a sessão Baileys da organização e atualiza o Supabase
 */
export async function disconnectTenantWhatsappAction(): Promise<ActionResponse<{ message: string }>> {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Sessão expirada. Faça login novamente.' };
    }

    const { data: lojista } = await supabase
      .from('lojistas')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!lojista) {
      return { success: false, error: 'Organização não encontrada.' };
    }

    const instanceName = `flow_${lojista.id}`;

    // Desconecta na Evolution API
    await logoutEvolutionInstance(instanceName);

    // Atualiza status no Supabase
    try {
      await supabase
        .from('whatsapp_instances')
        .update({ 
          status: 'disconnected', 
          updated_at: new Date().toISOString() 
        })
        .eq('organization_id', lojista.id);
    } catch (e) {}

    try {
      await supabase
        .from('configuracoes_robo')
        .update({ 
          status_conexao: 'desconectado', 
          updated_at: new Date().toISOString() 
        })
        .eq('lojista_id', lojista.id);
    } catch (e) {}

    revalidatePath('/dashboard/configuracoes');

    return {
      success: true,
      data: { message: 'WhatsApp desconectado com sucesso.' },
    };
  } catch (error: any) {
    console.error('[Action] disconnectTenantWhatsappAction Error:', error);
    return {
      success: false,
      error: error?.message || 'Erro ao desconectar WhatsApp.',
    };
  }
}

/**
 * 4. Envia mensagem transacional ou de teste a partir da instância da organização
 */
export async function sendTenantTextMessageAction(
  targetPhone: string,
  messageText: string
): Promise<ActionResponse<{ messageId?: string }>> {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Sessão expirada. Faça login novamente.' };
    }

    const { data: lojista } = await supabase
      .from('lojistas')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!lojista) {
      return { success: false, error: 'Organização não encontrada.' };
    }

    const instanceName = `flow_${lojista.id}`;
    const cleanPhone = formatToInternationalPhone(targetPhone);

    if (!cleanPhone) {
      return { success: false, error: 'Número de telefone inválido.' };
    }

    const sendRes = await sendTextMessage({
      instanceName,
      number: cleanPhone,
      text: messageText,
    });

    if (!sendRes.success) {
      return { success: false, error: sendRes.error || 'Falha no disparo da mensagem.' };
    }

    return {
      success: true,
      data: { messageId: sendRes.data?.key?.id },
    };
  } catch (error: any) {
    console.error('[Action] sendTenantTextMessageAction Error:', error);
    return {
      success: false,
      error: error?.message || 'Erro ao enviar mensagem WhatsApp.',
    };
  }
}
