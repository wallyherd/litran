import React, { useState } from 'react';
import { Instagram, MessageCircle, Facebook, Phone, Mail, ShieldCheck } from 'lucide-react';
import { STORE_CONFIG, CATEGORIES } from '../data/catalogData';

export const Footer = ({ onSelectCategory }) => {
  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [enviado, setEnviado] = useState(false);

  const handleNewsletterSubmit = (e) => {
    e.preventDefault();
    if (!email && !whatsapp) return;
    setEnviado(true);
    setTimeout(() => {
      setNome('');
      setWhatsapp('');
      setEmail('');
      setEnviado(false);
    }, 3000);
  };

  return (
    <footer className="bg-black text-white border-t border-white/10 pt-10 pb-8">
      <div className="container space-y-12">
        
        {/* Newsletter Box */}
        <div className="p-6 sm:p-8 bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-6">
            <div>
              <span className="text-[10px] uppercase font-bold text-[#dfa666] tracking-wider block mb-1">
                NOVIDADES DA LOJA
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-white">Receba novidades e promoções</h3>
              <p className="text-xs text-gray-400 mt-1">
                Cadastre seus dados e acompanhe as novidades da loja.
              </p>
            </div>
          </div>

          <form onSubmit={handleNewsletterSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <input
              type="text"
              placeholder="Seu nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="bg-black border border-white/15 text-white text-xs px-4 py-3 rounded-xl focus:outline-none focus:border-[#942620]"
            />
            <div className="flex items-center bg-black border border-white/15 rounded-xl px-3 py-1">
              <span className="text-xs text-gray-400 mr-2">🇧🇷 +55</span>
              <input
                type="text"
                placeholder="Seu WhatsApp"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="bg-transparent text-white text-xs py-2 w-full focus:outline-none"
              />
            </div>
            <input
              type="email"
              placeholder="Seu e-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-black border border-white/15 text-white text-xs px-4 py-3 rounded-xl focus:outline-none focus:border-[#942620]"
            />
            <button
              type="submit"
              className="bg-black hover:bg-neutral-800 text-white border border-white/20 px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors shadow"
            >
              {enviado ? 'Cadastrado!' : 'Eu quero'}
            </button>
          </form>
        </div>

        {/* Footer Columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          
          {/* Column 1: Logo & Socials */}
          <div className="space-y-4">
            <img
              src={STORE_CONFIG.logoHorizontal}
              alt="Litran Logo"
              referrerPolicy="no-referrer"
              className="h-10 w-auto object-contain cursor-pointer"
              onClick={() => onSelectCategory('inicio')}
              onError={(e) => { e.target.src = STORE_CONFIG.logoQuadrada; }}
            />
            <div className="flex items-center gap-3 pt-2">
              <a href="#" className="w-8 h-8 rounded-full bg-neutral-900 border border-white/10 text-gray-300 hover:text-white flex items-center justify-center transition-colors">
                <Instagram size={16} />
              </a>
              <a href={`https://wa.me/${STORE_CONFIG.whatsapp}`} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-neutral-900 border border-white/10 text-gray-300 hover:text-white flex items-center justify-center transition-colors">
                <MessageCircle size={16} />
              </a>
              <a href="#" className="w-8 h-8 rounded-full bg-neutral-900 border border-white/10 text-gray-300 hover:text-white flex items-center justify-center transition-colors">
                <Facebook size={16} />
              </a>
            </div>
          </div>

          {/* Column 2: Categorias Principais */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Categorias da Loja
            </h4>
            <ul className="space-y-1.5 text-xs text-gray-400">
              {CATEGORIES.slice(0, 6).map((cat) => (
                <li key={cat.id}>
                  <button
                    onClick={() => onSelectCategory(cat.id)}
                    className="hover:text-white transition-colors text-left"
                  >
                    {cat.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Ajuda e Atendimento */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Ajuda e atendimento
            </h4>
            <ul className="space-y-2 text-xs text-gray-400">
              <li className="flex items-center gap-2">
                <Phone size={14} className="text-[#942620]" />
                <span>(66) 99621-0809</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail size={14} className="text-[#942620]" />
                <span>gabilitranmodas.p@gmail.com</span>
              </li>
              <li>
                <a href={`https://wa.me/${STORE_CONFIG.whatsapp}`} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                  Atendimento via WhatsApp
                </a>
              </li>
            </ul>
          </div>

          {/* Column 4: Pagamento e Segurança */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Pagamento e segurança
            </h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              As opções disponíveis aparecem durante a finalização do pedido.
            </p>
            <div className="p-3 bg-neutral-900 border border-white/10 rounded-xl flex items-center gap-3">
              <ShieldCheck size={20} className="text-green-400" />
              <div className="text-[10px] text-gray-300">
                <strong className="block text-white">Ambiente protegido por SSL</strong>
                <span>Dados processados com segurança</span>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom copyright line */}
        <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-4">
          <div>
            <strong className="text-white font-semibold">LITRAN moda esportiva</strong>
            <p className="text-[11px] text-gray-500">Várzea Grande MT - MT • © 2026. Todos os direitos reservados.</p>
          </div>
        </div>

      </div>
    </footer>
  );
};
