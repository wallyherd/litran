import React from 'react';
import { Menu, Search, ShoppingBag, User, MessageCircle } from 'lucide-react';
import { STORE_CONFIG } from '../data/catalogData';
import { useCart } from '../context/CartContext';

export const Header = ({ onOpenMobileMenu, onOpenSearch, onOpenAccount }) => {
  const { totalItems, setIsCartOpen } = useCart();

  return (
    <header className="sticky top-0 z-50 bg-[#000000] border-b border-white/10 shadow-2xl py-2">
      <div className="container py-2">
        <div className="flex items-center justify-between gap-6">
          
          {/* Mobile menu trigger */}
          <button
            onClick={onOpenMobileMenu}
            className="xl:hidden p-2.5 text-white hover:text-[#942620] transition-colors rounded-xl bg-neutral-900 border border-white/10"
            aria-label="Abrir menu mobile"
          >
            <Menu size={24} />
          </button>

          {/* LEFT SIDE: Search Bar (Desktop - Larger Size) */}
          <div className="hidden xl:flex items-center flex-1 max-w-md">
            <div
              onClick={onOpenSearch}
              className="w-full flex items-center justify-between px-5 py-3 bg-black border border-[#942620] hover:border-red-600 rounded-full cursor-pointer transition-all shadow-inner group"
            >
              <span className="text-sm text-gray-400 group-hover:text-gray-200 truncate font-medium">
                Buscar Produtos
              </span>
              <Search size={20} className="text-[#942620] group-hover:scale-110 transition-transform" />
            </div>
          </div>

          {/* CENTER: Litran Brand Logo (Larger Size) */}
          <div className="flex items-center justify-center flex-1 sm:flex-initial">
            <a href="#" className="flex items-center gap-3 group">
              <img
                src={STORE_CONFIG.logoHorizontal}
                alt="Litran Moda Esportiva"
                referrerPolicy="no-referrer"
                className="h-12 sm:h-16 w-auto object-contain transition-transform group-hover:scale-105"
                onError={(e) => {
                  e.target.src = STORE_CONFIG.logoQuadrada;
                }}
              />
            </a>
          </div>

          {/* RIGHT SIDE: WhatsApp, Minha Conta, Carrinho (Larger Icons) */}
          <div className="flex items-center justify-end gap-5">
            
            {/* Search Icon Mobile */}
            <button
              onClick={onOpenSearch}
              className="xl:hidden p-2.5 text-white hover:text-[#942620] transition-colors"
            >
              <Search size={24} />
            </button>

            {/* WhatsApp Icon */}
            <a
              href={`https://wa.me/${STORE_CONFIG.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center text-gray-300 hover:text-green-400 transition-colors p-1"
              title="WhatsApp"
            >
              <MessageCircle size={26} className="text-[#942620] hover:text-green-400 transition-colors" />
            </a>

            {/* Minha Conta */}
            <button
              onClick={onOpenAccount}
              className="hidden sm:flex items-center gap-2 text-sm font-bold text-white hover:text-[#dfa666] transition-colors p-1"
            >
              <User size={24} className="text-[#942620]" />
              <div className="flex flex-col text-left leading-tight">
                <span className="text-xs uppercase font-extrabold text-white">Minha</span>
                <span className="text-[11px] text-gray-400 font-medium">Conta</span>
              </div>
            </button>

            {/* Shopping Cart Button */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="flex items-center gap-2.5 bg-neutral-900 border border-white/15 hover:border-[#942620] text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:bg-neutral-800 shadow-lg"
            >
              <ShoppingBag size={22} className="text-[#942620]" />
              <span className="bg-[#942620] text-white text-xs font-black px-2.5 py-0.5 rounded-full">
                {totalItems}
              </span>
            </button>

          </div>

        </div>
      </div>
    </header>
  );
};
