import React, { useState } from 'react';
import { X, Search, Rocket, Star, Tag, Gift, ChevronRight, ChevronDown, Dumbbell, Shield, Swords, Zap, Shirt, ShoppingBag, Grid } from 'lucide-react';
import { STORE_CONFIG, CATEGORIES } from '../data/catalogData';

const iconMap = {
  Grid: Grid,
  Dumbbell: Dumbbell,
  Flame: Rocket,
  Swords: Swords,
  Shield: Shield,
  Zap: Zap,
  Shirt: Shirt,
  ShoppingBag: ShoppingBag
};

export const MobileDrawer = ({ isOpen, onClose, activeCategory, onSelectCategory, onOpenSearch }) => {
  const [expandMaisCategorias, setExpandMaisCategorias] = useState(false);

  if (!isOpen) return null;

  const subMaisCategorias = [
    { id: 'camisetas', name: 'CAMISETA', image: 'https://arquivos.facilzap.app.br/produtos/1775343973_615ffa91e73dd4db872f.webp' },
    { id: 'blusas', name: 'BLUSA', image: 'https://arquivos.facilzap.app.br/produtos/1786706473_6938b5e856012860c798.webp' },
    { id: 'acessorios', name: 'ACESSÓRIOS', image: 'https://arquivos.facilzap.app.br/produtos/1776817587_41059a42abcff9d7a176.webp' }
  ];

  return (
    <div className="fixed inset-0 z-[1000] xl:hidden animate-fade-in">
      {/* Overlay backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer content */}
      <aside className="fixed inset-y-0 left-0 w-full max-w-xs bg-[#0d0d0d] text-white shadow-2xl z-10 flex flex-col border-r border-white/10 animate-slide-down">
        
        {/* Drawer Header */}
        <div className="p-4 bg-gradient-to-b from-[#942620] to-[#601511] relative overflow-hidden">
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="flex items-center gap-3">
              <img
                src={STORE_CONFIG.logoQuadrada}
                alt="Litran"
                className="w-10 h-10 rounded-xl bg-white p-0.5"
              />
              <div>
                <strong className="block text-sm font-bold leading-tight">LITRAN moda esportiva</strong>
                <span className="text-[11px] text-white/80">Explore nosso catálogo</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-black/20 flex items-center justify-center text-white hover:bg-black/40 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          <div className="relative z-10">
            <p className="text-xs font-semibold text-white/90 mb-2">Olá! O que você procura hoje?</p>
            <div
              onClick={() => { onClose(); onOpenSearch(); }}
              className="flex items-center gap-2 bg-white text-gray-800 px-3 py-2 rounded-xl text-xs cursor-pointer shadow-md"
            >
              <Search size={16} className="text-[#942620]" />
              <span>Buscar produtos no catálogo...</span>
            </div>
          </div>
        </div>

        {/* Drawer Scroll Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          
          {/* Quick Discover Section */}
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-2">
              Descobrir
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => { onSelectCategory('inicio'); onClose(); }}
                className="flex flex-col items-center justify-center p-3 bg-neutral-900 border border-white/5 rounded-xl hover:border-[#942620] transition-colors group text-center cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-[#942620]/20 text-[#942620] flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                  <Rocket size={16} />
                </div>
                <span className="text-[10px] font-medium text-gray-200">Lançamentos</span>
              </button>

              <button
                onClick={() => { onSelectCategory('inicio'); onClose(); }}
                className="flex flex-col items-center justify-center p-3 bg-neutral-900 border border-white/5 rounded-xl hover:border-[#942620] transition-colors group text-center cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-[#dfa666]/20 text-[#dfa666] flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                  <Star size={16} />
                </div>
                <span className="text-[10px] font-medium text-gray-200">Mais Vendidos</span>
              </button>

              <button
                onClick={() => { onSelectCategory('inicio'); onClose(); }}
                className="flex flex-col items-center justify-center p-3 bg-neutral-900 border border-white/5 rounded-xl hover:border-[#942620] transition-colors group text-center cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-green-500/20 text-green-400 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                  <Tag size={16} />
                </div>
                <span className="text-[10px] font-medium text-gray-200">Promoções</span>
              </button>
            </div>
          </div>

          {/* Featured Banner Card */}
          <div className="p-3 bg-gradient-to-r from-neutral-900 to-neutral-800 border border-[#942620]/40 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#942620] flex items-center justify-center text-white">
                <Gift size={20} />
              </div>
              <div>
                <strong className="block text-xs font-bold">Frete Grátis &gt; R$ 150</strong>
                <span className="text-[10px] text-gray-400">Entregamos em todo o Brasil</span>
              </div>
            </div>
            <ChevronRight size={16} className="text-[#dfa666]" />
          </div>

          {/* Categories List */}
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-2">
              Categorias
            </span>
            <ul className="space-y-1">
              {CATEGORIES.map(cat => {
                const IconComponent = iconMap[cat.icon] || Grid;
                const isActive = activeCategory === cat.id;

                if (cat.id === 'mais-categorias') {
                  return (
                    <li key={cat.id} className="space-y-1">
                      <button
                        onClick={() => setExpandMaisCategorias(!expandMaisCategorias)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl transition-all text-xs font-medium cursor-pointer ${
                          expandMaisCategorias || ['camisetas', 'blusas', 'acessorios'].includes(activeCategory)
                            ? 'bg-[#942620] text-white font-bold'
                            : 'bg-neutral-900/50 text-gray-300 hover:bg-neutral-800'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <IconComponent size={18} className="text-[#dfa666]" />
                          <span>MAIS CATEGORIAS</span>
                        </div>
                        {expandMaisCategorias ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>

                      {/* Sub-items accordion */}
                      {expandMaisCategorias && (
                        <div className="pl-4 pr-1 py-2 space-y-1.5 bg-[#8b201a]/40 rounded-xl border border-[#942620]/30 mt-1">
                          {subMaisCategorias.map((sub) => (
                            <button
                              key={sub.id}
                              onClick={() => {
                                onSelectCategory(sub.id);
                                onClose();
                              }}
                              className={`w-full flex items-center gap-3 p-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                activeCategory === sub.id
                                  ? 'bg-[#942620] text-white'
                                  : 'text-gray-200 hover:bg-white/10'
                              }`}
                            >
                              <img
                                src={sub.image}
                                alt=""
                                loading="lazy"
                                decoding="async"
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = '/categories/cat-moda-fitness.jpg';
                                }}
                                className="w-7 h-7 rounded-full object-cover border border-white/40"
                              />
                              <span>{sub.name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </li>
                  );
                }

                return (
                  <li key={cat.id}>
                    <button
                      onClick={() => {
                        onSelectCategory(cat.id);
                        onClose();
                      }}
                      className={`w-full flex items-center justify-between p-3 rounded-xl transition-all text-xs font-medium cursor-pointer ${
                        isActive
                          ? 'bg-[#942620] text-white font-bold shadow-lg shadow-[#942620]/30'
                          : 'bg-neutral-900/50 text-gray-300 hover:bg-neutral-800 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <IconComponent size={18} className={isActive ? 'text-white' : 'text-[#dfa666]'} />
                        <span>{cat.name}</span>
                      </div>
                      <ChevronRight size={16} className="opacity-50" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-white/10 text-center bg-black/40">
          <p className="text-[11px] text-gray-400">
            Plataforma & E-commerce por <strong className="text-[#dfa666]">HDSoluções</strong>
          </p>
        </div>

      </aside>
    </div>
  );
};
