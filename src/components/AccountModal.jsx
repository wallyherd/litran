import React, { useState } from 'react';
import { X, User, Lock, Phone, ArrowRight, ShieldCheck } from 'lucide-react';
import { useCart } from '../context/CartContext';

export const AccountModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const { customerData, setCustomerData } = useCart();
  const [isSaved, setIsSaved] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="modal-overlay">
      <div
        className="bg-[#111111] border border-white/10 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl relative animate-slide-down"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black">
          <div className="flex items-center gap-2">
            <User size={20} className="text-[#942620]" />
            <h3 className="font-bold text-sm text-white">Minha Conta LITRAN</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 text-gray-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-xs text-gray-400 leading-relaxed">
            Cadastre seus dados para agilizar seus próximos pedidos no WhatsApp e acompanhar suas compras.
          </p>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Seu Nome:</label>
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
            <label className="block text-xs font-semibold text-gray-300 mb-1">WhatsApp:</label>
            <div className="relative flex items-center">
              <Phone size={16} className="absolute left-3 text-gray-500" />
              <input
                type="text"
                required
                placeholder="(00) 90000-0000"
                value={customerData.whatsapp}
                onChange={(e) => setCustomerData(prev => ({ ...prev, whatsapp: e.target.value }))}
                className="w-full bg-black border border-white/10 text-white text-xs pl-9 pr-3 py-2.5 rounded-xl focus:outline-none focus:border-[#942620]"
              />
            </div>
          </div>

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

          <button
            type="submit"
            className="w-full bg-[#942620] hover:bg-[#b52e27] text-white py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-[#942620]/30 transition-all"
          >
            {isSaved ? 'Dados Salvos!' : 'Salvar Dados'}
          </button>
        </form>
      </div>
    </div>
  );
};
