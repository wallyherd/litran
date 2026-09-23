import React from 'react';
import { Truck, ShieldCheck, CreditCard } from 'lucide-react';

export const AnnouncementBar = () => {
  return (
    <div className="ticker-wrap border-b border-white/10">
      <div className="ticker text-xs font-bold uppercase tracking-wider">
        <div className="ticker-item">
          <span className="inline-flex items-center gap-1.5 font-semibold text-white">
            <Truck size={14} className="text-[#942620]" /> Frete Grátis em compras acima de R$ 150,00 para todo o Brasil!
          </span>
        </div>
        <div className="ticker-item">
          <span className="inline-flex items-center gap-1.5 font-semibold text-white">
            <CreditCard size={14} className="text-[#942620]" /> Parcele suas compras em até 6x sem juros no cartão!
          </span>
        </div>
        <div className="ticker-item">
          <span className="inline-flex items-center gap-1.5 font-semibold text-white">
            Bem-vindos à loja LITRAN moda esportiva! Dúvidas? Fale no WhatsApp!
          </span>
        </div>
        <div className="ticker-item">
          <span className="inline-flex items-center gap-1.5 font-semibold text-white">
            <ShieldCheck size={14} className="text-[#942620]" /> Tecnologia & Atendimento por HDSoluções
          </span>
        </div>
        
        {/* Duplicate for seamless infinite loop */}
        <div className="ticker-item">
          <span className="inline-flex items-center gap-1.5 font-semibold text-white">
            <Truck size={14} className="text-[#942620]" /> Frete Grátis em compras acima de R$ 150,00 para todo o Brasil!
          </span>
        </div>
        <div className="ticker-item">
          <span className="inline-flex items-center gap-1.5 font-semibold text-white">
            <CreditCard size={14} className="text-[#942620]" /> Parcele suas compras em até 6x sem juros no cartão!
          </span>
        </div>
      </div>
    </div>
  );
};
