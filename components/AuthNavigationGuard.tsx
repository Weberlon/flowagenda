'use client';

import React, { useState, useEffect, useTransition, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft, LogOut, Home, X, Loader2 } from 'lucide-react';
import { logoutAction } from '@/app/actions/auth';

interface AuthNavigationGuardProps {
  rootPath: '/dashboard' | '/superadmin';
  isImpersonating?: boolean;
  showExitButton?: boolean;
}

export function AuthNavigationGuard({
  rootPath,
  isImpersonating = false,
  showExitButton = true,
}: AuthNavigationGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [isLoggingOut, startLogoutTransition] = useTransition();
  const sentinelPushedRef = useRef(false);

  const isAtRoot = pathname === rootPath && !isImpersonating;

  // Intercepta tentativa de recuar pelo botão Voltar do navegador além da raiz autenticada
  useEffect(() => {
    if (!isAtRoot || typeof window === 'undefined') {
      sentinelPushedRef.current = false;
      return;
    }

    if (!sentinelPushedRef.current) {
      window.history.pushState({ flowAuthRoot: true }, '', window.location.href);
      sentinelPushedRef.current = true;
    }

    const handlePopState = () => {
      setShowLeaveModal(true);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isAtRoot]);

  const handleBackClick = () => {
    if (isImpersonating) {
      window.location.assign('/superadmin?exit_impersonation=true');
      return;
    }

    if (!isAtRoot) {
      router.push(rootPath);
      return;
    }

    setShowLeaveModal(true);
  };

  const handleStayInPanel = () => {
    setShowLeaveModal(false);
    if (isAtRoot && typeof window !== 'undefined') {
      window.history.pushState({ flowAuthRoot: true }, '', window.location.href);
      sentinelPushedRef.current = true;
    }
  };

  const handleGoToSite = () => {
    setShowLeaveModal(false);
    window.location.assign('/');
  };

  const handleLogout = () => {
    startLogoutTransition(async () => {
      await logoutAction();
    });
  };

  return (
    <>
      <div className="inline-flex items-center gap-2">
        <button
          type="button"
          onClick={handleBackClick}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[#4C566A] bg-[#242933] px-3 py-1.5 text-xs font-semibold text-[#ECEFF4] hover:border-[#88C0D0] hover:text-[#88C0D0] transition-colors"
          title={
            isImpersonating
              ? 'Voltar ao Painel Super Admin'
              : !isAtRoot
                ? 'Voltar para o início do painel'
                : 'Voltar'
          }
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Voltar</span>
        </button>

        {showExitButton && (
          <button
            type="button"
            disabled={isLoggingOut}
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#BF616A]/40 bg-[#BF616A]/10 px-3 py-1.5 text-xs font-semibold text-[#BF616A] hover:bg-[#BF616A] hover:text-[#ECEFF4] disabled:opacity-50 transition-colors"
            title="Encerrar sessão com segurança"
          >
            {isLoggingOut ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <LogOut className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">{isLoggingOut ? 'Saindo...' : 'Sair'}</span>
          </button>
        )}
      </div>

      {/* Modal de Confirmação de Saída para o Site Principal (Sem Encerrar Sessão) */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#4C566A] bg-[#2E3440] text-[#ECEFF4] shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#4C566A]/60 bg-[#3B4252]">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-[#88C0D0]/15 border border-[#88C0D0]/30 flex items-center justify-center text-[#88C0D0]">
                  <Home className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-[#ECEFF4]">Confirmação de Navegação</h3>
              </div>
              <button
                type="button"
                onClick={handleStayInPanel}
                className="rounded-lg p-1 text-[#D8DEE9]/70 hover:bg-[#434C5E] hover:text-white transition"
                aria-label="Fechar janela de confirmação"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <p className="text-sm text-[#ECEFF4] leading-relaxed">
                Você chegou ao início do painel. Deseja ir para o site principal?
              </p>
              <p className="text-xs text-[#D8DEE9]/70">
                Sua sessão continuará ativa para você retornar ao painel quando quiser.
              </p>

              <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleStayInPanel}
                  className="rounded-xl border border-[#4C566A] bg-[#3B4252] hover:bg-[#434C5E] px-4 py-2.5 text-xs font-semibold text-[#ECEFF4] transition"
                >
                  Não, continuar no painel
                </button>
                <button
                  type="button"
                  onClick={handleGoToSite}
                  className="rounded-xl bg-[#88C0D0] hover:bg-[#88C0D0]/90 px-4 py-2.5 text-xs font-bold text-[#2E3440] transition"
                >
                  Sim, ir para o site
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
