import React from 'react';
import { ShieldCheck, MessageCircle, Truck, Info } from 'lucide-react';

export const TrustBadges = () => {
  return (
    <section className="py-6 bg-black border-t border-white/10">
      <div className="container">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* Badge 1 */}
          <div className="p-4 bg-neutral-900/90 border border-white/10 rounded-2xl flex items-center gap-3 shadow-md">
            <ShieldCheck size={24} className="text-[#942620] flex-shrink-0" />
            <div>
              <strong className="block text-xs font-bold text-white">Compra segura</strong>
              <span className="text-[11px] text-gray-400">Dados protegidos durante toda a compra.</span>
            </div>
          </div>

          {/* Badge 2 */}
          <div className="p-4 bg-neutral-900/90 border border-white/10 rounded-2xl flex items-center gap-3 shadow-md">
            <MessageCircle size={24} className="text-[#942620] flex-shrink-0" />
            <div>
              <strong className="block text-xs font-bold text-white">Atendimento direto</strong>
              <span className="text-[11px] text-gray-400">Fale com a loja pelo WhatsApp.</span>
            </div>
          </div>

          {/* Badge 3 */}
          <div className="p-4 bg-neutral-900/90 border border-white/10 rounded-2xl flex items-center gap-3 shadow-md">
            <Truck size={24} className="text-[#942620] flex-shrink-0" />
            <div>
              <strong className="block text-xs font-bold text-white">Formas de entrega</strong>
              <span className="text-[11px] text-gray-400">Consulte prazos e opções disponíveis.</span>
            </div>
          </div>

          {/* Badge 4 */}
          <div className="p-4 bg-neutral-900/90 border border-white/10 rounded-2xl flex items-center gap-3 shadow-md">
            <Info size={24} className="text-[#942620] flex-shrink-0" />
            <div>
              <strong className="block text-xs font-bold text-white">Informações da loja</strong>
              <span className="text-[11px] text-gray-400">Conheça os dados da loja antes de comprar.</span>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
