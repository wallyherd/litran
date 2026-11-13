import React, { useState } from 'react';
import { ShoppingCart, Heart, Plus, Minus, Check } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useFavorites } from '../context/FavoritesContext';
import { SafeImage } from './SafeImage';

export const ProductCard = ({ product, onQuickView, priority = false }) => {
  const { addToCart } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const favorited = isFavorite(product.id);

  const handleBuy = (e) => {
    e.stopPropagation();
    const sizeToUse = product.sizes ? product.sizes[0] : 'Único';
    addToCart(product, sizeToUse, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const primaryImage = product.images?.[0] || '';
  const secondaryImages = product.images?.slice(1) || [];

  return (
    <div className="bg-white text-gray-900 border border-gray-200 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col group relative">
      
      {/* Product Image Area */}
      <div
        onClick={() => onQuickView(product)}
        className="relative w-full aspect-[3/4] overflow-hidden bg-gray-100 cursor-pointer"
      >
        <SafeImage
          src={primaryImage}
          fallbackSrcs={secondaryImages}
          alt={product.name}
          priority={priority}
          imgClassName="group-hover:scale-105 transition-transform duration-500"
        />

        {/* Top Left Badge: Destaque */}
        <div className="absolute top-3 left-3 z-10">
          <span className="bg-black text-white text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-md shadow">
            {product.tag || 'Destaque'}
          </span>
        </div>

        {/* Top Right Heart Icon */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(product);
          }}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm text-gray-700 flex items-center justify-center hover:text-red-500 transition-colors shadow"
          title={favorited ? 'Remover dos favoritos' : 'Salvar nos favoritos'}
        >
          <Heart size={16} fill={favorited ? 'red' : 'none'} className={favorited ? 'text-red-500' : ''} />
        </button>
      </div>

      {/* Product Information */}
      <div className="p-4 flex-1 flex flex-col justify-between bg-white text-left">
        <div>
          <h3
            onClick={() => onQuickView(product)}
            className="text-xs font-extrabold text-gray-900 uppercase tracking-tight line-clamp-2 cursor-pointer mb-2 leading-snug hover:text-[#942620] transition-colors"
          >
            {product.name}
          </h3>

          {/* Pricing */}
          <div className="mb-3">
            <span className="text-[11px] text-gray-500 block">
              {product.originalPrice ? 'a partir de' : ''}
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-extrabold text-gray-900">
                R$ {product.price.toFixed(2).replace('.', ',')}
              </span>
              {product.originalPrice > product.price && (
                <span className="text-[11px] text-gray-400 line-through">
                  R$ {product.originalPrice.toFixed(2).replace('.', ',')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quantity Stepper & Buy Button (Screenshots 4 & 5) */}
        <div className="space-y-2 pt-2 border-t border-gray-100">
          
          {/* Quantity Stepper */}
          <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-1">
            <button
              onClick={(e) => { e.stopPropagation(); setQuantity(Math.max(1, quantity - 1)); }}
              className="w-7 h-7 rounded bg-white text-gray-700 hover:bg-gray-200 flex items-center justify-center font-bold transition-colors shadow-sm"
            >
              <Minus size={12} />
            </button>
            <span className="text-xs font-bold text-gray-900">{quantity}</span>
            <button
              onClick={(e) => { e.stopPropagation(); setQuantity(quantity + 1); }}
              className="w-7 h-7 rounded bg-white text-gray-700 hover:bg-gray-200 flex items-center justify-center font-bold transition-colors shadow-sm"
            >
              <Plus size={12} />
            </button>
          </div>

          {/* Buy Button */}
          <button
            onClick={handleBuy}
            className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
              added
                ? 'bg-green-600 text-white'
                : 'bg-black hover:bg-neutral-800 text-white shadow'
            }`}
          >
            {added ? (
              <>
                <Check size={14} />
                <span>Adicionado!</span>
              </>
            ) : (
              <>
                <ShoppingCart size={14} />
                <span>Comprar</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
