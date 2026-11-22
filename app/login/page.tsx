'use client';

import { useState } from 'react';
import Link from 'next/link';
import { login } from '@/app/actions/auth';
import { BrandLogo } from '@/components/BrandLogo';

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await login(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#242933] p-4 font-sans text-[#ECEFF4]">
      <div className="w-full max-w-md rounded-2xl bg-[#2E3440] p-8 shadow-2xl border border-[#4C566A]/60">
        <div className="mb-8 flex flex-col items-center text-center space-y-4">
          <Link href="/" className="inline-flex">
            <BrandLogo variant="lg" showText={false} />
          </Link>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-[#ECEFF4]">
              Entrar no FlowAgenda
            </h1>
            <p className="mt-1.5 text-xs text-[#D8DEE9]/75">
              Acesse o painel administrativo do seu estabelecimento.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl bg-[#BF616A]/15 p-3.5 text-xs font-medium text-[#BF616A] border border-[#BF616A]/40">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-[#D8DEE9]">
              E-mail
            </label>
            <div className="mt-1.5">
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="block w-full rounded-xl border border-[#4C566A] bg-[#242933] px-3.5 py-2.5 text-sm text-[#ECEFF4] placeholder-[#D8DEE9]/40 focus:border-[#88C0D0] focus:outline-none focus:ring-1 focus:ring-[#88C0D0]"
                placeholder="exemplo@email.com"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-[#D8DEE9]">
              Senha
            </label>
            <div className="mt-1.5">
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="block w-full rounded-xl border border-[#4C566A] bg-[#242933] px-3.5 py-2.5 text-sm text-[#ECEFF4] focus:border-[#88C0D0] focus:outline-none focus:ring-1 focus:ring-[#88C0D0]"
              />
            </div>
          </div>

          <div className="pt-1">
            <button
              type="submit"
              disabled={loading}
              className="flex w-full justify-center rounded-xl bg-[#88C0D0] px-4 py-3 text-sm font-black text-[#242933] shadow-lg hover:bg-[#88C0D0]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Entrando...' : 'Entrar no Painel'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
