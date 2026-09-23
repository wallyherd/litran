import React, { useState, useEffect, useRef } from 'react';
import { X, Search, Sparkles, ArrowRight } from 'lucide-react';
import { useProducts } from '../context/ProductContext';
import { SafeImage } from './SafeImage';

export const SearchModal = ({ isOpen, onClose, onQuickView, onSearchSubmit }) => {
  if (!isOpen) return null;

  const { products } = useProducts();
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const results = query.trim().length > 0
    ? products.filter(p =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.category.toLowerCase().includes(query.toLowerCase()) ||
        p.subcategory.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  const handleSelectProduct = (product) => {
    onClose();
    onQuickView(product);
  };

  const handleSelectTag = (tag) => {
    setQuery(tag);
  };

  return (
    <div className="modal-overlay">
      <div
        className="bg-[#111111] border border-white/10 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl relative animate-slide-down"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-[#942620]/20 text-[#dfa666] rounded-lg">
              <Sparkles size={18} />
            </span>
            <div>
              <h3 className="text-sm font-bold text-white">Busca Inteligente LITRAN</h3>
              <p className="text-[11px] text-gray-400">Encontre artigos esportivos instantaneamente</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 text-gray-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Input bar */}
        <div className="p-4 border-b border-white/10 bg-neutral-900/50">
          <div className="relative flex items-center">
            <Search size={20} className="absolute left-3 text-[#942620]" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Digite o nome do produto, esporte ou categoria..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-black border border-white/10 text-white placeholder-gray-500 pl-10 pr-10 py-3 rounded-xl text-sm focus:outline-none focus:border-[#942620] transition-colors"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 text-gray-400 hover:text-white"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Quick Suggestions Chips */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className="text-[11px] text-gray-400 font-medium">Sugestões:</span>
            {['Muay Thai', 'Moda Fitness', 'Whey Protein', 'Kimono', 'Top Feminino'].map((chip) => (
              <button
                key={chip}
                onClick={() => handleSelectTag(chip)}
                className="text-[11px] bg-white/5 hover:bg-[#942620] text-gray-300 hover:text-white px-2.5 py-1 rounded-full border border-white/5 transition-all"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        {/* Results List */}
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          {query.trim().length === 0 ? (
            <div className="py-8 text-center text-gray-500 text-xs">
              Digite algum termo para buscar produtos no catálogo.
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-gray-400 font-semibold mb-2">
                {results.length} resultado(s) encontrado(s):
              </p>
              {results.map((product) => (
                <div
                  key={product.id}
                  onClick={() => handleSelectProduct(product)}
                  className="flex items-center justify-between p-3 bg-neutral-900/60 border border-white/5 rounded-xl hover:border-[#942620] hover:bg-neutral-800 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-black">
                      <SafeImage
                        src={product.images?.[0]}
                        fallbackSrcs={product.images?.slice(1)}
                        alt={product.name}
                        className="w-full h-full"
                      />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-white group-hover:text-[#dfa666] transition-colors">
                        {product.name}
                      </h4>
                      <span className="text-[10px] text-gray-400 uppercase tracking-wider">
                        {product.subcategory}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-white">
                      R$ {product.price.toFixed(2).replace('.', ',')}
                    </span>
                    <ArrowRight size={16} className="text-[#942620] group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-gray-400 text-xs">
              Nenhum produto encontrado para "<strong className="text-white">{query}</strong>".
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
