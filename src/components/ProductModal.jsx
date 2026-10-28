import React, { useState, useMemo } from 'react';
import { X, ChevronLeft, ChevronRight, Eye, Heart, Share2, MessageCircle, Truck, ShoppingBag, Star, Play, Copy, Check, ExternalLink, Palette } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useFavorites } from '../context/FavoritesContext';
import { useAuth } from '../context/AuthContext';
import { PRODUCTS, STORE_CONFIG } from '../data/catalogData';
import { SafeImage } from './SafeImage';

export const ProductModal = ({ product, onClose, onOpenAccount }) => {
  if (!product) return null;

  const { addToCart } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { isAuthenticated } = useAuth();
  const [activeMediaIdx, setActiveMediaIdx] = useState(0);
  const [selectedColor, setSelectedColor] = useState(null);
  const [variationQty, setVariationQty] = useState({
    'v1': 0,
    'v2': 0,
    'v3': 0
  });
  const [cep, setCep] = useState('');
  const [freteResult, setFreteResult] = useState(null);
  const [isCalculando, setIsCalculando] = useState(false);
  const [addedNotice, setAddedNotice] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [favoriteToast, setFavoriteToast] = useState(null);
  const [showLoginNotice, setShowLoginNotice] = useState(false);

  // Combine video + images into unified media list (including colorImages)
  const mediaItems = useMemo(() => {
    const list = [];
    const addedUrls = new Set();

    if (product.video) {
      list.push({ type: 'video', url: product.video });
    }
    if (product.images && product.images.length > 0) {
      product.images.forEach((img) => {
        const u = typeof img === 'string' ? img : img?.url;
        if (u && typeof u === 'string' && u.trim().length > 0 && !addedUrls.has(u)) {
          addedUrls.add(u);
          list.push({ type: 'image', url: u });
        }
      });
    }
    // Adiciona fotos cadastradas no mapa de cores
    if (product.colorImages && typeof product.colorImages === 'object') {
      Object.values(product.colorImages).forEach((u) => {
        if (u && typeof u === 'string' && u.trim().length > 0 && !addedUrls.has(u)) {
          addedUrls.add(u);
          list.push({ type: 'image', url: u });
        }
      });
    }
    if (list.length === 0) {
      list.push({ type: 'image', url: '/products/conjunto-bicolor-suplex-power.jpg' });
    }
    return list;
  }, [product]);

  // Extrair todas as cores disponíveis com suas respectivas fotos
  const availableColors = useMemo(() => {
    const colorMap = new Map();

    // 1. Cores cadastradas no dicionário colorImages do produto
    if (product.colorImages && typeof product.colorImages === 'object') {
      Object.entries(product.colorImages).forEach(([colorName, imgUrl]) => {
        if (colorName && colorName.trim()) {
          colorMap.set(colorName.trim(), imgUrl || null);
        }
      });
    }

    // 2. Cores das variações do produto
    if (product.variations && Array.isArray(product.variations)) {
      product.variations.forEach((v) => {
        let detectedColor = (v.color || '').trim();
        // Se a cor não estiver explicitada, extrai do nome (ex: "ROSA PINK M" -> "ROSA PINK")
        if (!detectedColor && v.name && v.name !== 'Único') {
          const parts = v.name.trim().split(/\s+/);
          if (parts.length > 1) {
            const lastWord = parts[parts.length - 1].toUpperCase();
            if (['P', 'M', 'G', 'GG', 'XG', 'XGG', 'U', 'UNICO', 'ÚNICO', '36', '38', '40', '42', '44', '46', '48'].includes(lastWord)) {
              detectedColor = parts.slice(0, -1).join(' ').trim();
            }
          }
        }

        if (detectedColor) {
          const currentImg = colorMap.get(detectedColor) || v.imageUrl || null;
          colorMap.set(detectedColor, currentImg);
        }
      });
    }

    return Array.from(colorMap.entries()).map(([name, imageUrl]) => ({
      name,
      imageUrl
    }));
  }, [product]);

  // Ao clicar em uma cor, muda para a foto correspondente
  const handleSelectColor = (colorName) => {
    setSelectedColor((prev) => (prev?.toLowerCase() === colorName.toLowerCase() ? null : colorName));

    const colorObj = availableColors.find((c) => c.name.toLowerCase() === colorName.toLowerCase());
    const colorPhoto = colorObj?.imageUrl || product.colorImages?.[colorName];

    if (colorPhoto) {
      const foundIdx = mediaItems.findIndex((m) => m.url === colorPhoto);
      if (foundIdx !== -1) {
        setActiveMediaIdx(foundIdx);
      }
    }
  };

  const variations = (product.variations && product.variations.length > 0)
    ? product.variations
    : [
        { id: `v_${product.id}`, name: 'Único', price: product.price, sku: product.sku || product.refCode || String(product.id) }
      ];

  // Reordena as variações trazendo as da cor selecionada para o início
  const displayedVariations = useMemo(() => {
    if (!selectedColor) return variations;
    const cleanSel = selectedColor.toLowerCase();
    const matches = [];
    const others = [];

    variations.forEach((v) => {
      const vColor = (v.color || '').toLowerCase();
      const vName = (v.name || '').toLowerCase();
      if (vColor === cleanSel || vName.includes(cleanSel)) {
        matches.push(v);
      } else {
        others.push(v);
      }
    });

    return [...matches, ...others];
  }, [variations, selectedColor]);

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
                      onClick={() => {
                        setActiveMediaIdx(idx);
                        const matchedColor = availableColors.find(c => c.imageUrl === item.url);
                        if (matchedColor) {
                          setSelectedColor(matchedColor.name);
                        }
                      }}
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

              {/* SELEÇÃO DE CORES DISPONÍVEIS COM FOTOS */}
              {availableColors.length > 0 && (
                <div className="space-y-2.5 pt-1 border-b border-gray-100 pb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-neutral-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Palette size={14} className="text-[#942620]" />
                      Cor:{' '}
                      {selectedColor ? (
                        <strong className="text-[#942620]">{selectedColor}</strong>
                      ) : (
                        <span className="text-gray-400 font-normal">Clique na cor para ver a foto</span>
                      )}
                    </span>
                    {selectedColor && (
                      <button
                        type="button"
                        onClick={() => setSelectedColor(null)}
                        className="text-[11px] text-gray-500 hover:text-neutral-900 font-bold underline cursor-pointer"
                      >
                        Ver todas as cores
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {availableColors.map((c) => {
                      const isSelected = selectedColor?.toLowerCase() === c.name.toLowerCase();
                      return (
                        <button
                          key={c.name}
                          type="button"
                          onClick={() => handleSelectColor(c.name)}
                          className={`group relative flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 transition-all cursor-pointer ${
                            isSelected
                              ? 'border-[#942620] bg-red-50 text-[#942620] shadow-sm font-black scale-[1.02]'
                              : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 text-neutral-800 font-bold'
                          }`}
                        >
                          {c.imageUrl ? (
                            <div className="w-6 h-6 rounded-lg overflow-hidden border border-black/10 shrink-0 bg-neutral-100 shadow-xs">
                              <SafeImage src={c.imageUrl} alt={c.name} className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <span className="w-3.5 h-3.5 rounded-full border border-gray-300 bg-neutral-800 shrink-0" />
                          )}

                          <span className="text-xs uppercase tracking-tight">
                            {c.name}
                          </span>

                          {isSelected && (
                            <Check size={13} className="text-[#942620] shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Variations List */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-neutral-800 uppercase tracking-wider">
                    Escolha as variações {selectedColor ? `de ${selectedColor}` : ''}
                  </h4>
                  {selectedColor && (
                    <span className="text-[10px] bg-red-50 text-[#942620] font-black px-2 py-0.5 rounded-full border border-red-200 uppercase">
                      Filtrando cor
                    </span>
                  )}
                </div>

                <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                  {displayedVariations.map((item) => {
                    const currentQty = variationQty[item.id] || 0;
                    const isColorMatch = selectedColor && (
                      (item.color || '').toLowerCase() === selectedColor.toLowerCase() ||
                      (item.name || '').toLowerCase().includes(selectedColor.toLowerCase())
                    );

                    return (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between p-3.5 border rounded-xl transition-all ${
                          isColorMatch
                            ? 'bg-red-50/40 border-[#942620]/60 ring-1 ring-[#942620]/30 shadow-sm'
                            : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            {item.imageUrl ? (
                              <div className="w-6 h-6 rounded-md overflow-hidden border border-black/10 shrink-0 shadow-xs">
                                <SafeImage src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                              </div>
                            ) : (
                              <span className="w-2.5 h-2.5 bg-black rounded-full inline-block" />
                            )}
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

              {/* Notifications: Favorite feedback & Login requirement */}
              {favoriteToast && (
                <div className="p-2.5 bg-neutral-900 border border-emerald-500/40 text-emerald-400 text-xs font-bold rounded-xl text-center animate-fade-in shadow">
                  {favoriteToast}
                </div>
              )}

              {showLoginNotice && (
                <div className="p-3 bg-red-950/80 border border-red-500/40 text-white text-xs rounded-xl flex items-center justify-between gap-2 animate-fade-in shadow">
                  <span>Você precisa entrar na sua conta para salvar produtos nos favoritos.</span>
                  {onOpenAccount && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowLoginNotice(false);
                        onClose();
                        onOpenAccount();
                      }}
                      className="bg-[#942620] hover:bg-red-700 text-white font-black px-2.5 py-1 rounded-lg text-[11px] shrink-0 transition-colors"
                    >
                      Acessar Conta
                    </button>
                  )}
                </div>
              )}

              {/* Action Icons: Favorite, Compartilhar, Tirar dúvidas */}
              <div className="flex items-center justify-center gap-6 pt-2 text-gray-500 text-xs font-bold relative">
                
                {/* Favorite */}
                <button
                  onClick={() => {
                    const res = toggleFavorite(product);
                    if (res.requireLogin) {
                      setShowLoginNotice(true);
                      setTimeout(() => setShowLoginNotice(false), 4000);
                    } else {
                      setFavoriteToast(res.message);
                      setTimeout(() => setFavoriteToast(null), 2500);
                    }
                  }}
                  className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
                    isFavorite(product.id) ? 'text-red-600 font-extrabold' : 'hover:text-red-600'
                  }`}
                  title={isFavorite(product.id) ? 'Remover dos favoritos' : 'Salvar nos favoritos da minha conta'}
                >
                  <Heart
                    size={16}
                    fill={isFavorite(product.id) ? 'currentColor' : 'none'}
                    className={isFavorite(product.id) ? 'text-red-600 scale-110 transition-transform' : ''}
                  />
                  <span>{isFavorite(product.id) ? 'Favoritado' : 'Favorite'}</span>
                </button>

                {/* Compartilhar (entre Favorite e Tirar dúvidas) */}
                <div className="relative">
                  <button
                    onClick={() => setShowShareModal(!showShareModal)}
                    className="flex items-center gap-1.5 hover:text-green-600 transition-colors cursor-pointer"
                    title="Compartilhar link do produto"
                  >
                    <Share2 size={16} /> Compartilhar
                  </button>

                  {/* Modal / Popover de Compartilhamento */}
                  {showShareModal && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-neutral-900 border border-white/15 rounded-2xl p-3 shadow-2xl z-50 animate-slide-down text-left">
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
                        <span className="text-[11px] font-bold text-white uppercase tracking-wider">
                          Compartilhar Produto
                        </span>
                        <button
                          onClick={() => setShowShareModal(false)}
                          className="text-gray-400 hover:text-white"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      <div className="space-y-2">
                        {/* Opção WhatsApp */}
                        <a
                          href={`https://wa.me/?text=${encodeURIComponent(
                            `Olha esse produto incrível que encontrei na Litran Moda Esportiva:\n*${product.name}* - R$ ${product.price.toFixed(2).replace('.', ',')}\n\nConfira o produto no link:\n${typeof window !== 'undefined' ? `${window.location.origin}/?product=${product.id}` : ''}`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => setShowShareModal(false)}
                          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow"
                        >
                          <MessageCircle size={15} /> Compartilhar no WhatsApp
                        </a>

                        {/* Opção Copiar Link */}
                        <button
                          type="button"
                          onClick={() => {
                            const url = `${window.location.origin}/?product=${product.id}`;
                            navigator.clipboard.writeText(url);
                            setCopiedLink(true);
                            setTimeout(() => {
                              setCopiedLink(false);
                              setShowShareModal(false);
                            }, 1500);
                          }}
                          className="w-full bg-neutral-800 hover:bg-neutral-700 text-gray-200 font-bold text-xs py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all border border-white/10"
                        >
                          {copiedLink ? (
                            <>
                              <Check size={14} className="text-emerald-400" />
                              <span className="text-emerald-400">Link Copiado!</span>
                            </>
                          ) : (
                            <>
                              <Copy size={14} /> Copiar Link
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Tirar dúvidas */}
                <a
                  href={`https://wa.me/${STORE_CONFIG.whatsapp}?text=${encodeURIComponent(
                    `Estou com dúvidas sobre o produto *${product.name}* (Ref: ${product.refCode || product.sku || product.id}).\n\nLink do produto: ${typeof window !== 'undefined' ? `${window.location.origin}/?product=${product.id}` : ''}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 hover:text-green-600 transition-colors"
                  title="Tirar dúvidas pelo WhatsApp com link do produto"
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
