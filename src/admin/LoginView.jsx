import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, ShieldAlert, ShieldCheck, ArrowLeft } from 'lucide-react';
import { API_BASE } from '../config/api';

export function LoginView() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      });

      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Credenciais inválidas. Verifique seu e-mail e senha.');
        }
        login(data.user, data.token);
      } else {
        const text = await res.text();
        if (!res.ok) {
          throw new Error(`Falha no servidor (${res.status}).`);
        }
        throw new Error('Resposta inesperada do servidor.');
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-3.5 sm:p-4 w-full max-w-full overflow-x-hidden">
      <div className="bg-black border border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-8 max-w-md w-full shadow-2xl space-y-5 sm:space-y-6">
        
        <div className="flex items-center justify-between gap-2">
          <a href="/" className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors">
            <ArrowLeft size={14} /> Voltar à Loja
          </a>
          <span className="text-[9px] sm:text-[10px] uppercase font-bold text-gray-400 bg-neutral-900 border border-white/10 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full flex items-center gap-1 shrink-0">
            <ShieldCheck size={12} className="text-emerald-400" /> SSL Seguro
          </span>
        </div>

        <div className="text-center space-y-1 pt-1 sm:pt-2">
          <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-white">
            LITRAN <span className="text-[#942620]">SISTEMA</span>
          </h1>
          <p className="text-xs text-gray-400">Estoque Central, PDV Balcão & Gestão</p>
        </div>

        {errorMsg && (
          <div className="bg-red-950/80 border border-red-500 text-white p-3 rounded-xl text-xs flex items-center gap-2">
            <ShieldAlert size={16} className="text-red-400 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-gray-400 mb-1.5">E-mail de Acesso</label>
            <div className="flex items-center bg-neutral-900 border border-white/15 rounded-xl px-3.5 py-2.5 focus-within:border-[#942620] transition-colors">
              <Mail size={16} className="text-[#942620] mr-2.5 shrink-0" />
              <input
                type="email"
                placeholder="seu.email@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="bg-transparent text-white text-xs w-full focus:outline-none placeholder-gray-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-gray-400 mb-1.5">Senha</label>
            <div className="flex items-center bg-neutral-900 border border-white/15 rounded-xl px-3.5 py-2.5 focus-within:border-[#942620] transition-colors">
              <Lock size={16} className="text-[#942620] mr-2.5 shrink-0" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="bg-transparent text-white text-xs w-full focus:outline-none placeholder-gray-600"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#942620] hover:bg-red-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg disabled:opacity-50"
          >
            {loading ? 'Autenticando...' : 'Entrar no Sistema'}
          </button>
        </form>

        <div className="pt-4 border-t border-white/10 text-center">
          <p className="text-[11px] text-gray-500">
            Ambiente corporativo restrito. Todas as ações e acessos são registrados e auditados em conformidade com as diretrizes de segurança da LITRAN.
          </p>
        </div>

      </div>
    </div>
  );
}
