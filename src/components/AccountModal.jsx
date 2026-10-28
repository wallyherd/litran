import React, { useState } from 'react';
import { X, User, Heart, Trash2, ShoppingBag, LogIn, LogOut, Check, ArrowRight, ShieldCheck, Mail, Lock } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useFavorites } from '../context/FavoritesContext';
import { useAuth } from '../context/AuthContext';
import { SafeImage } from './SafeImage';
import { API_BASE } from '../config/api';

export const AccountModal = ({ isOpen, onClose, onOpenQuickView }) => {
  if (!isOpen) return null;

  const { customerData, setCustomerData, addToCart } = useCart();
  const { favorites, removeFavorite } = useFavorites();
  const { user, login, logout, isAuthenticated } = useAuth();

  const [activeTab, setActiveTab] = useState(favorites.length > 0 ? 'favorites' : (isAuthenticated ? 'profile' : 'login'));
  const [isSaved, setIsSaved] = useState(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  const handleProfileSubmit = (e) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 1200);
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail.trim(), password: loginPassword })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Credenciais inválidas. Verifique seu e-mail e senha.');
      }
      login(data.user, data.token);
      setActiveTab('favorites');
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setLoginLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        className="bg-[#111111] border border-white/10 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl relative animate-slide-down flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black">
          <div className="flex items-center gap-2">
            <User size={20} className="text-[#942620]" />
            <div>
              <h3 className="font-black text-sm text-white uppercase tracking-wider">
                Minha Conta LITRAN
              </h3>
              {user && (
                <p className="text-[10px] text-gray-400">
                  Olá, <strong className="text-white">{user.name}</strong> ({user.email})
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 text-gray-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-white/10 bg-neutral-900/50 text-xs font-bold">
          <button
            onClick={() => setActiveTab('favorites')}
            className={`flex-1 py-3 px-2 flex items-center justify-center gap-1.5 transition-colors border-b-2 ${
              activeTab === 'favorites'
                ? 'border-[#942620] text-white bg-black/40'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Heart size={14} className={favorites.length > 0 ? 'text-red-500 fill-red-500' : ''} />
            <span>Favoritos</span>
            <span className="text-[10px] bg-[#942620] text-white px-1.5 py-0.2 rounded-full font-black">
              {favorites.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-3 px-2 flex items-center justify-center gap-1.5 transition-colors border-b-2 ${
              activeTab === 'profile'
                ? 'border-[#942620] text-white bg-black/40'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <User size={14} />
            <span>Meus Dados</span>
          </button>

          {!isAuthenticated ? (
            <button
              onClick={() => setActiveTab('login')}
              className={`flex-1 py-3 px-2 flex items-center justify-center gap-1.5 transition-colors border-b-2 ${
                activeTab === 'login'
                  ? 'border-[#942620] text-white bg-black/40'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <LogIn size={14} />
              <span>Entrar</span>
            </button>
          ) : (
            <button
              onClick={logout}
              title="Encerrar sessão"
              className="py-3 px-4 text-xs text-gray-400 hover:text-red-400 flex items-center gap-1 border-b-2 border-transparent transition-colors"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Sair</span>
            </button>
          )}
        </div>

        {/* Tab Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          
          {/* TAB 1: MEUS FAVORITOS */}
          {activeTab === 'favorites' && (
            <div className="space-y-3">
              {!isAuthenticated && (
                <div className="p-3 bg-neutral-900 border border-white/10 rounded-2xl flex items-center justify-between gap-3 text-xs">
                  <div className="space-y-0.5">
                    <p className="font-bold text-white">Sincronize com sua conta</p>
                    <p className="text-[11px] text-gray-400">Faça login para manter seus produtos favoritos salvos permanentemente.</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('login')}
                    className="bg-[#942620] hover:bg-red-700 text-white font-bold text-[11px] px-3 py-1.5 rounded-xl shrink-0"
                  >
                    Entrar
                  </button>
                </div>
              )}

              {favorites.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <div className="w-14 h-14 rounded-full bg-neutral-900 border border-white/10 flex items-center justify-center mx-auto text-gray-600">
                    <Heart size={28} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-white">Nenhum favorito ainda</h4>
                    <p className="text-xs text-gray-400 max-w-xs mx-auto">
                      Explore nosso catálogo e clique no botão <strong>"Favorite"</strong> em qualquer peça para salvar aqui!
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="bg-[#942620] hover:bg-[#b52e27] text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow"
                  >
                    Ver Catálogo de Produtos
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <p className="text-[11px] text-gray-400">
                    Você tem <strong>{favorites.length}</strong> {favorites.length === 1 ? 'produto salvo' : 'produtos salvos'} na sua conta:
                  </p>
                  {favorites.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-3 bg-neutral-900/70 border border-white/10 rounded-2xl hover:border-white/20 transition-all"
                    >
                      {/* Product Thumbnail */}
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-black flex-shrink-0 border border-white/5">
                        <SafeImage
                          src={item.images?.[0]}
                          alt={item.name}
                          className="w-full h-full"
                        />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 text-left">
                        <h4 className="text-xs font-bold text-white truncate uppercase">
                          {item.name}
                        </h4>
                        <span className="text-[10px] text-gray-400 uppercase block">
                          {item.subcategory || 'MODA FITNESS'}
                        </span>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className="text-xs font-black text-[#dfa666]">
                            R$ {item.price.toFixed(2).replace('.', ',')}
                          </span>
                          {item.originalPrice > item.price && (
                            <span className="text-[10px] text-gray-500 line-through">
                              R$ {item.originalPrice.toFixed(2).replace('.', ',')}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {onOpenQuickView && (
                          <button
                            onClick={() => {
                              onClose();
                              onOpenQuickView(item);
                            }}
                            className="bg-neutral-800 hover:bg-neutral-700 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition-colors"
                            title="Ver Detalhes do Produto"
                          >
                            Ver Peça
                          </button>
                        )}
                        <button
                          onClick={() => {
                            addToCart(item, 'Único', 1);
                          }}
                          className="bg-[#942620] hover:bg-red-700 text-white p-1.5 rounded-lg transition-colors"
                          title="Adicionar ao Carrinho"
                        >
                          <ShoppingBag size={14} />
                        </button>
                        <button
                          onClick={() => removeFavorite(item.id)}
                          className="text-gray-500 hover:text-red-400 p-1.5 rounded-lg transition-colors"
                          title="Remover dos favoritos"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MEUS DADOS */}
          {activeTab === 'profile' && (
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <p className="text-xs text-gray-400 leading-relaxed">
                Preencha seus dados para agilizar seus próximos pedidos no WhatsApp e facilitar entregas.
              </p>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Seu Nome Completo:</label>
                <div className="relative flex items-center">
                  <User size={16} className="absolute left-3 text-gray-500" />
                  <input
                    type="text"
                    required
                    placeholder="Nome completo"
                    value={customerData.nome}
                    onChange={(e) => setCustomerData(prev => ({ ...prev, nome: e.target.value }))}
                    className="w-full bg-black border border-white/10 text-white text-xs pl-9 pr-3 py-2.5 rounded-xl focus:outline-none focus:border-[#942620]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">WhatsApp de Contato:</label>
                <input
                  type="text"
                  required
                  placeholder="(66) 99999-9999"
                  value={customerData.whatsapp}
                  onChange={(e) => setCustomerData(prev => ({ ...prev, whatsapp: e.target.value }))}
                  className="w-full bg-black border border-white/10 text-white text-xs px-3 py-2.5 rounded-xl focus:outline-none focus:border-[#942620]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">CEP de Entrega:</label>
                  <input
                    type="text"
                    placeholder="00000-000"
                    value={customerData.cep}
                    onChange={(e) => setCustomerData(prev => ({ ...prev, cep: e.target.value }))}
                    className="w-full bg-black border border-white/10 text-white text-xs px-3 py-2.5 rounded-xl focus:outline-none focus:border-[#942620]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Cidade:</label>
                  <input
                    type="text"
                    placeholder="Sua cidade"
                    value={customerData.cidade || ''}
                    onChange={(e) => setCustomerData(prev => ({ ...prev, cidade: e.target.value }))}
                    className="w-full bg-black border border-white/10 text-white text-xs px-3 py-2.5 rounded-xl focus:outline-none focus:border-[#942620]"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-[#942620] hover:bg-[#b52e27] text-white py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-[#942620]/30 transition-all cursor-pointer"
              >
                {isSaved ? 'Dados Salvos com Sucesso!' : 'Salvar Dados'}
              </button>
            </form>
          )}

          {/* TAB 3: LOGIN NA CONTA */}
          {activeTab === 'login' && !isAuthenticated && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="text-center space-y-1">
                <h4 className="text-sm font-black uppercase text-white">Acessar Conta Litran</h4>
                <p className="text-xs text-gray-400">Entre para gerenciar seus favoritos e histórico</p>
              </div>

              {loginError && (
                <div className="bg-red-950/80 border border-red-500 text-white p-3 rounded-xl text-xs flex items-center gap-2">
                  <span>{loginError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">E-mail</label>
                <div className="flex items-center bg-black border border-white/15 rounded-xl px-3 py-2.5">
                  <Mail size={16} className="text-[#942620] mr-2 shrink-0" />
                  <input
                    type="email"
                    required
                    placeholder="seu.email@exemplo.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="bg-transparent text-white text-xs w-full focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Senha</label>
                <div className="flex items-center bg-black border border-white/15 rounded-xl px-3 py-2.5">
                  <Lock size={16} className="text-[#942620] mr-2 shrink-0" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="bg-transparent text-white text-xs w-full focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-3 bg-[#942620] hover:bg-red-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg disabled:opacity-50 cursor-pointer"
              >
                {loginLoading ? 'Entrando...' : 'Entrar na Conta'}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};
