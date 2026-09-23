import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Eye, Heart, Share2, MessageCircle, Truck, ShoppingBag, Star, Play } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { PRODUCTS, STORE_CONFIG } from '../data/catalogData';
import { SafeImage } from './SafeImage';

export const ProductModal = ({ product, onClose }) => {
  if (!product) return null;

  const { addToCart } = useCart();
  const [activeMediaIdx, setActiveMediaIdx] = useState(0);
  const [variationQty, setVariationQty] = useState({
    'v1': 0,
    'v2': 0,
    'v3': 0
  });
  const [cep, setCep] = useState('');
  const [freteResult, setFreteResult] = useState(null);
  const [isCalculando, setIsCalculando] = useState(false);
  const [addedNotice, setAddedNotice] = useState(false);

  // Combine video + images into unified media list
  const mediaItems = [];
  if (product.video) {
    mediaItems.push({ type: 'video', url: product.video });
  }
  if (product.images && product.images.length > 0) {
    product.images.forEach((img) => {
      if (img && typeof img === 'string' && img.trim().length > 0) {
        mediaItems.push({ type: 'image', url: img });
      }
    });
  }
  if (mediaItems.length === 0) {
    mediaItems.push({ type: 'image', url: '/products/conjunto-bicolor-suplex-power.jpg' });
  }

  const variations = (product.variations && product.variations.length > 0)
    ? product.variations
    : [
        { id: `v_${product.id}`, name: 'Único', price: product.price, sku: product.sku || product.refCode || String(product.id) }
      ];

  const handleQtyChange = (varId, delta) => {
    setVariationQty((prev) => {
      const current = prev[varId] || 0;
      const updated = Math.max(0, current + delta);
      return { ...prev, [varId]: updated };
    });
  };

  const handleAddToCart = () => {
    let totalAdded = 0;
    Object.entries(variationQty).forEach(([varId, qty]) => {
      if (qty > 0) {
        const itemVar = variations.find((v) => v.id === varId);
        if (itemVar) {
          addToCart(product, itemVar.name, qty);
          totalAdded += qty;
        }
      }
    });

    if (totalAdded === 0) {
      addToCart(product, product.sizes ? product.sizes[0] : 'Único', 1);
    }

    setAddedNotice(true);
    setTimeout(() => {
      setAddedNotice(false);
      onClose();
    }, 1200);
  };

  const handleCalcularFrete = (e) => {
    e.preventDefault();
    if (!cep || cep.length < 8) return;
    setIsCalculando(true);
    setTimeout(() => {
      setIsCalculando(false);
      setFreteResult({
        pac: 'R$ 18,90 (4 a 6 dias úteis)',
        sedex: 'R$ 29,90 (1 a 2 dias úteis)',
        gratis: product.price >= 150 ? 'FRETE GRÁTIS' : null
      });
    }, 500);
  };

  const relatedProducts = PRODUCTS.filter((p) => p.id !== product.id).slice(0, 4);
  const activeMedia = mediaItems[activeMediaIdx] || mediaItems[0];
  const primaryFallback = product.images?.[0] || '/products/conjunto-bicolor-suplex-power.jpg';

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
    >
      {/* Main Modal Container */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative bg-white text-neutral-900 rounded-3xl w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-2xl my-auto p-6 sm:p-10 border border-gray-200"
      >
        {/* Top Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-40 w-10 h-10 rounded-full bg-black text-white flex items-center justify-center hover:bg-[#942620] transition-colors shadow-lg cursor-pointer"
          aria-label="Fechar"
        >
          <X size={22} />
        </button>

        <div className="space-y-10">
          
          {/* SECTION 1: GALLERY & PRODUCT DETAILS HEADER */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left side: Thumbnails + Main Photo/Video Slider */}
            <div className="lg:col-span-7 flex flex-col sm:flex-row gap-4">
              
              {/* Vertical Thumbnails List */}
              {mediaItems.length > 1 && (
                <div className="flex sm:flex-col gap-3 order-2 sm:order-1 overflow-x-auto sm:overflow-y-auto max-h-[420px]">
                  {mediaItems.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveMediaIdx(idx)}
                      className={`relative w-16 h-20 rounded-xl overflow-hidden border-2 transition-all flex-shrink-0 cursor-pointer ${
                        activeMediaIdx === idx
                          ? 'border-[#942620] shadow-md scale-105'
                          : 'border-gray-200 opacity-70 hover:opacity-100'
                      }`}
                    >
                      {item.type === 'video' ? (
                        <div className="w-full h-full bg-neutral-900 flex items-center justify-center text-white relative">
                          <Play size={20} className="text-white fill-white" />
                          <span className="absolute bottom-1 text-[9px] font-black uppercase tracking-wider bg-red-600 px-1 rounded">VÍDEO</span>
                        </div>
                      ) : (
                        <SafeImage
                          src={item.url}
                          alt=""
                          className="w-full h-full"
                        />
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Main Media Display Card (Photo or Video) */}
              <div className="relative flex-1 aspect-[3/4] rounded-2xl overflow-hidden bg-neutral-100 border border-gray-200 order-1 sm:order-2 shadow-md">
                
                {/* Views Counter (Top left badge) */}
                <div className="absolute top-3 left-3 z-10 bg-black/60 backdrop-blur-md text-white text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5 shadow">
                  <Eye size={14} className="text-gray-300" />
                  <span>{product.views || 777} vistos</span>
                </div>

                {activeMedia.type === 'video' ? (
                  <video
                    src={activeMedia.url}
                    autoPlay
                    loop
                    muted
                    controls
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <SafeImage
                    src={activeMedia.url}
                    fallbackSrcs={product.images ? product.images.filter((u) => u !== activeMedia.url) : []}
                    alt={product.name}
                    className="w-full h-full"
                  />
                )}

                {/* Slider Nav Arrows */}
                {mediaItems.length > 1 && (
                  <>
                    <button
                      onClick={() => setActiveMediaIdx((prev) => (prev === 0 ? mediaItems.length - 1 : prev - 1))}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black transition-colors cursor-pointer z-10"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button
                      onClick={() => setActiveMediaIdx((prev) => (prev + 1) % mediaItems.length)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black transition-colors cursor-pointer z-10"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Right side: Product Title, Ref, Price & Variations */}
            <div className="lg:col-span-5 space-y-5">
              
              {/* Category, Ref code & Badge */}
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="bg-gray-100 text-gray-700 font-extrabold px-2.5 py-1 rounded-md uppercase tracking-wider">
                  {product.subcategory || 'MODA FITNESS'}
                </span>
                <span className="text-gray-400 font-medium">{product.refCode || 'Ref: F142433842'}</span>
                <span className="bg-neutral-900 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
                  Destaque
                </span>
              </div>

              {/* Title */}
              <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 uppercase tracking-tight leading-tight">
                {product.name}
              </h1>

              {/* Price */}
              <div className="space-y-1 border-b border-gray-100 pb-4">
                <span className="text-xs text-gray-400 uppercase font-bold tracking-wider block">a partir de</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-neutral-900">
                    R$ {product.price.toFixed(2).replace('.', ',')}
                  </span>
                  {product.originalPrice > product.price && (
                    <span className="text-sm text-gray-400 line-through font-semibold">
                      R$ {product.originalPrice.toFixed(2).replace('.', ',')}
                    </span>
                  )}
                </div>
              </div>

              {/* Variations List */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-black text-neutral-800 uppercase tracking-wider">
                  Escolha as variações
                </h4>

                <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                  {variations.map((item) => {
                    const currentQty = variationQty[item.id] || 0;

                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3.5 bg-gray-50 border border-gray-200 rounded-xl transition-all hover:border-gray-300"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 bg-black rounded-full inline-block" />
                            <strong className="text-xs font-black text-neutral-900 uppercase">{item.name}</strong>
                          </div>
                          <span className="text-xs text-gray-500 font-semibold block mt-0.5">
                            R$ {item.price.toFixed(2).replace('.', ',')}
                          </span>
                        </div>

                        {/* Quantity Stepper */}
                        <div className="flex items-center bg-white border border-gray-300 rounded-lg overflow-hidden shadow-sm">
                          <button
                            onClick={() => handleQtyChange(item.id, -1)}
                            className="w-8 h-8 flex items-center justify-center font-black text-gray-700 hover:bg-gray-100 text-sm cursor-pointer"
                          >
                            -
                          </button>
                          <span className="w-8 text-center text-xs font-black text-neutral-900">
                            {currentQty}
                          </span>
                          <button
                            onClick={() => handleQtyChange(item.id, 1)}
                            className="w-8 h-8 flex items-center justify-center font-black text-gray-700 hover:bg-gray-100 text-sm cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Calculate Shipping */}
              <div className="p-4 bg-emerald-50/60 border border-emerald-100 rounded-2xl space-y-2">
                <label className="block text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                  <Truck size={16} className="text-emerald-600" />
                  <span>Calcule o frete</span>
                </label>
                <p className="text-[11px] text-emerald-800">
                  Informe seu CEP para consultar prazo e entrega.
                </p>

                <form onSubmit={handleCalcularFrete} className="flex gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="BR 00000-000"
                    maxLength={9}
                    value={cep}
                    onChange={(e) => setCep(e.target.value)}
                    className="bg-white border border-emerald-200 text-neutral-900 text-xs px-3 py-2 rounded-xl flex-1 focus:outline-none focus:border-emerald-500 font-semibold"
                  />
                  <button
                    type="submit"
                    disabled={isCalculando}
                    className="bg-neutral-800 hover:bg-neutral-900 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors shadow cursor-pointer"
                  >
                    {isCalculando ? '...' : 'Calcular'}
                  </button>
                </form>

                {freteResult && (
                  <div className="mt-2 text-xs text-emerald-950 font-medium space-y-1 pt-2 border-t border-emerald-200/60">
                    {freteResult.gratis && <p className="font-bold text-emerald-700">✓ {freteResult.gratis}</p>}
                    <p>📦 PAC: {freteResult.pac}</p>
                    <p>⚡ SEDEX: {freteResult.sedex}</p>
                  </div>
                )}
              </div>

              {/* Add to Cart CTA Button */}
              <button
                onClick={handleAddToCart}
                className={`w-full py-4 px-6 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-xl cursor-pointer ${
                  addedNotice
                    ? 'bg-emerald-600 text-white'
                    : 'bg-black hover:bg-neutral-800 text-white shadow-black/20 hover:-translate-y-0.5'
                }`}
              >
                <ShoppingBag size={20} />
                <span>{addedNotice ? 'Adicionado com sucesso!' : 'Adicionar ao Carrinho'}</span>
              </button>

              {/* Action Icons */}
              <div className="flex items-center justify-center gap-6 pt-2 text-gray-500 text-xs font-bold">
                <button className="flex items-center gap-1.5 hover:text-red-600 transition-colors cursor-pointer">
                  <Heart size={16} /> Favorite
                </button>
                <button className="flex items-center gap-1.5 hover:text-blue-600 transition-colors cursor-pointer">
                  <Share2 size={16} /> Compartilhar
                </button>
                <a
                  href={`https://wa.me/${STORE_CONFIG.whatsapp}?text=Olá,%20tenho%20dúvida%20sobre%20o%20produto%20${encodeURIComponent(product.name)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 hover:text-green-600 transition-colors"
                >
                  <MessageCircle size={16} /> Tirar dúvidas
                </a>
              </div>

            </div>

          </div>

          {/* SECTION 2: SOBRE O PRODUTO */}
          <div className="border-t border-gray-100 pt-8 space-y-4">
            <span className="text-[11px] font-black uppercase text-gray-400 tracking-widest block">
              SOBRE O PRODUTO
            </span>
            <h3 className="text-xl font-black text-neutral-900 uppercase tracking-tight">
              Descrição do produto
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed max-w-4xl font-normal">
              {product.description}
            </p>
          </div>

          {/* SECTION 3: GALERIA (FOTOS DO PRODUTO) */}
          <div className="border-t border-gray-100 pt-8 space-y-4">
            <span className="text-[11px] font-black uppercase text-gray-400 tracking-widest block">
              GALERIA
            </span>
            <h3 className="text-xl font-black text-neutral-900 uppercase tracking-tight">
              Fotos do produto
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {product.images && product.images.filter(img => img && typeof img === 'string').map((img, idx) => (
                <div key={idx} className="aspect-[3/4] rounded-2xl overflow-hidden bg-gray-100 border border-gray-200 shadow-sm">
                  <SafeImage
                    src={img}
                    fallbackSrcs={product.images.filter((u) => u !== img)}
                    alt={product.name}
                    imgClassName="hover:scale-105 transition-transform duration-500"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 4: PRODUTOS RELACIONADOS */}
          <div className="border-t border-gray-100 pt-8 space-y-4">
            <h3 className="text-xl font-black text-neutral-900 uppercase tracking-tight">
              Produtos relacionados
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {relatedProducts.map((rel) => (
                <div key={rel.id} className="p-3 bg-gray-50 border border-gray-200 rounded-2xl text-left space-y-2">
                  <div className="aspect-[3/4] rounded-xl overflow-hidden bg-neutral-200">
                    <SafeImage
                      src={rel.images?.[0]}
                      fallbackSrcs={rel.images?.slice(1)}
                      alt={rel.name}
                      className="w-full h-full"
                    />
                  </div>
                  <h5 className="text-xs font-bold text-neutral-900 truncate uppercase">{rel.name}</h5>
                  <span className="text-xs font-black text-neutral-900 block">
                    R$ {rel.price.toFixed(2).replace('.', ',')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 5: PERGUNTAS E AVALIAÇÕES */}
          <div className="border-t border-gray-100 pt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Perguntas */}
            <div className="p-6 bg-gray-50 border border-gray-200 rounded-2xl space-y-3 text-center">
              <h4 className="text-sm font-black text-neutral-900 uppercase">Perguntas</h4>
              <p className="text-xs text-gray-500">
                Nenhuma pergunta neste produto ainda. Que tal enviar a primeira pergunta?
              </p>
              <button className="bg-neutral-900 hover:bg-black text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-colors cursor-pointer">
                Enviar Pergunta
              </button>
            </div>

            {/* Avaliações dos clientes */}
            <div className="p-6 bg-gray-50 border border-gray-200 rounded-2xl space-y-3 text-center">
              <h4 className="text-sm font-black text-neutral-900 uppercase flex items-center justify-center gap-1">
                <Star size={16} className="text-amber-500 fill-amber-500" /> Avaliações dos clientes
              </h4>
              <p className="text-xs text-gray-500">
                Este produto ainda não possui avaliações. Seja o primeiro a avaliar!
              </p>
              <button className="bg-neutral-900 hover:bg-black text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-colors cursor-pointer">
                Avaliar Produto
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
