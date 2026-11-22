import { NextResponse } from 'next/server';
import { verifySuperAdminSession } from '@/lib/admin-auth';
import {
  fetchInstanceConnectionStatus,
  updateInstanceProfilePicture,
} from '@/lib/evolution';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const auth = await verifySuperAdminSession();
  if (!auth.authorized) {
    return NextResponse.json(
      { error: 'Não autorizado. Acesso restrito a Super Admins.' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json().catch(() => null);
    const instanceName =
      (typeof body?.instanceName === 'string' && body.instanceName.trim()) ||
      'flowagenda-teste';
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, '') ||
      'https://www.flowagenda.online';
    const pictureUrl =
      (typeof body?.pictureUrl === 'string' && body.pictureUrl.trim()) ||
      `${baseUrl}/brand/logo-flowagenda.png`;

    const connStatus = await fetchInstanceConnectionStatus(instanceName);
    if (connStatus.state !== 'open') {
      return NextResponse.json(
        {
          success: false,
          error: `A instância "${instanceName}" não está conectada (estado: ${connStatus.state}). Conecte o QR Code primeiro.`,
        },
        { status: 400 }
      );
    }

    const res = await updateInstanceProfilePicture(instanceName, pictureUrl);
    if (!res.success) {
      return NextResponse.json(
        { success: false, error: res.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      instanceName,
      pictureUrl,
      message: `Foto de perfil da instância "${instanceName}" atualizada com o logo FlowAgenda.`,
    });
  } catch (err: any) {
    console.error('[Admin WhatsApp Profile Picture] Erro:', err?.message || err);
    return NextResponse.json(
      { success: false, error: 'Erro interno ao atualizar foto de perfil.' },
      { status: 500 }
    );
  }
}
