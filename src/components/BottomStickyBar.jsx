import React from 'react';
import { MessageCircle, ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { STORE_CONFIG } from '../data/catalogData';

export const BottomStickyBar = () => {
  const { totalItems, total, setIsCartOpen } = useCart();

  return (
    <div className="fixed bottom-3 left-0 right-0 z-50 px-4 pointer-events-none">
      <div className="container max-w-4xl mx-auto flex items-center justify-between gap-2 pointer-events-auto">
        
        {/* Left Floating Atendimento Pill Button */}
        <a
          href={`https://wa.me/${STORE_CONFIG.whatsapp}`}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-black hover:bg-neutral-900 border border-white/20 text-white px-3 py-2 sm:px-4 sm:py-2.5 rounded-full text-xs font-bold flex items-center gap-2 shadow-2xl transition-transform hover:scale-105"
        >
          <MessageCircle size={16} className="text-[#942620]" />
          <span className="hidden sm:inline">Atendimento</span>
        </a>

        {/* Middle Cart Summary Box */}
        <div
          onClick={() => setIsCartOpen(true)}
          className="flex-1 bg-white text-gray-900 border border-gray-200 px-4 py-2 rounded-full shadow-2xl flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors mx-2"
        >
          <div className="flex items-center gap-2 truncate">
            <ShoppingBag size={16} className="text-black" />
            {totalItems > 0 ? (
              <span className="text-xs font-bold text-gray-900 truncate">
                {totalItems} item(ns) no carrinho (R$ {total.toFixed(2).replace('.', ',')})
              </span>
            ) : (
              <div className="flex flex-col text-left leading-tight truncate">
                <span className="text-[11px] font-bold text-gray-900 truncate">Seu carrinho está vazio</span>
                <span className="text-[10px] text-gray-500 truncate">Adicione produtos para continuar</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Finalizar Pedido Pill Button */}
        <button
          onClick={() => setIsCartOpen(true)}
          className="bg-black hover:bg-neutral-900 border border-white/20 text-white px-4 py-2 sm:px-5 sm:py-2.5 rounded-full text-xs font-bold flex items-center gap-2 shadow-2xl transition-transform hover:scale-105"
        >
          <span>Finalizar pedido</span>
          <ArrowRight size={14} className="text-[#dfa666]" />
        </button>

      </div>
    </div>
  );
};
