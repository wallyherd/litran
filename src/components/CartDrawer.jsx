import React, { useState } from 'react';
import { X, Trash2, Plus, Minus, ShoppingBag, Truck, Tag, Send, ArrowRight, ShieldCheck } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { STORE_CONFIG } from '../data/catalogData';
import { SafeImage } from './SafeImage';

export const CartDrawer = () => {
  const {
    cart,
    isCartOpen,
    setIsCartOpen,
    removeFromCart,
    updateQuantity,
    subtotal,
    discountPercent,
    discountValue,
    total,
    remainingForFreeShipping,
    isFreeShippingEligible,
    coupon,
    applyCoupon,
    removeCoupon,
    customerData,
    setCustomerData,
    checkoutWhatsAppUrl
  } = useCart();

  const [couponInput, setCouponInput] = useState('');
  const [couponMessage, setCouponMessage] = useState(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [showCheckoutForm, setShowCheckoutForm] = useState(false);

  if (!isCartOpen) return null;

  const handleApplyCoupon = async (e) => {
    e.preventDefault();
    if (!couponInput) return;
    setApplyingCoupon(true);
    setCouponMessage(null);
    const res = await applyCoupon(couponInput);
    setCouponMessage(res);
    setApplyingCoupon(false);
  };

  const handleCustomerChange = (field, value) => {
    setCustomerData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 z-[1000] animate-fade-in">
      {/* Overlay backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        onClick={() => setIsCartOpen(false)}
      />

      {/* Cart Drawer */}
      <aside className="fixed inset-y-0 right-0 w-full max-w-md bg-[#0d0d0d] text-white shadow-2xl z-10 flex flex-col border-l border-white/10 animate-slide-down">
        
        {/* Drawer Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black">
          <div className="flex items-center gap-2">
            <ShoppingBag size={20} className="text-[#942620]" />
            <h3 className="font-bold text-sm">Seu Carrinho de Compras</h3>
          </div>
          <button
            onClick={() => setIsCartOpen(false)}
            className="w-8 h-8 rounded-full bg-white/5 text-gray-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Free Shipping Progress Bar */}
        <div className="p-3 bg-neutral-900 border-b border-white/10 text-xs">
          {isFreeShippingEligible ? (
            <div className="flex items-center gap-2 text-green-400 font-bold">
              <Truck size={16} />
              <span>Parabéns! Você ganhou **FRETE GRÁTIS**!</span>
            </div>
          ) : (
            <div>
              <div className="flex justify-between text-gray-300 text-[11px] mb-1">
                <span>Faltam <strong>R$ {remainingForFreeShipping.toFixed(2).replace('.', ',')}</strong> para Frete Grátis</span>
                <span>R$ 150,00</span>
              </div>
              <div className="w-full h-1.5 bg-black rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#942620] to-[#dfa666] transition-all duration-300"
                  style={{ width: `${Math.min(100, (subtotal / STORE_CONFIG.freteGratisMinimo) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Drawer Body - Items list or Form */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {cart.length === 0 ? (
            <div className="py-20 text-center text-gray-400 flex flex-col items-center">
              <ShoppingBag size={48} className="text-gray-600 mb-3" />
              <p className="font-bold text-white mb-1">Seu carrinho está vazio</p>
              <p className="text-xs text-gray-500 max-w-xs mb-4">
                Explore nosso catálogo de moda esportiva e artes marciais para adicionar produtos.
              </p>
              <button
                onClick={() => setIsCartOpen(false)}
                className="btn-primary text-xs"
              >
                Voltar às Compras
              </button>
            </div>
          ) : showCheckoutForm ? (
            /* Checkout Customer Form */
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <h4 className="text-xs font-bold text-[#dfa666] uppercase tracking-wider">
                  Dados de Entrega
                </h4>
                <button
                  onClick={() => setShowCheckoutForm(false)}
                  className="text-xs text-gray-400 underline hover:text-white"
                >
                  Voltar aos Itens
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-300 mb-1">Nome Completo:</label>
                <input
                  type="text"
                  placeholder="Seu nome"
                  value={customerData.nome}
                  onChange={(e) => handleCustomerChange('nome', e.target.value)}
                  className="w-full bg-black border border-white/10 text-white text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-[#942620]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-300 mb-1">WhatsApp (DDD + Número):</label>
                <input
                  type="text"
                  placeholder="(00) 90000-0000"
                  value={customerData.whatsapp}
                  onChange={(e) => handleCustomerChange('whatsapp', e.target.value)}
                  className="w-full bg-black border border-white/10 text-white text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-[#942620]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-300 mb-1">CEP:</label>
                  <input
                    type="text"
                    placeholder="00000-000"
                    value={customerData.cep}
                    onChange={(e) => handleCustomerChange('cep', e.target.value)}
                    className="w-full bg-black border border-white/10 text-white text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-[#942620]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-300 mb-1">Número:</label>
                  <input
                    type="text"
                    placeholder="123"
                    value={customerData.numero}
                    onChange={(e) => handleCustomerChange('numero', e.target.value)}
                    className="w-full bg-black border border-white/10 text-white text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-[#942620]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-300 mb-1">Rua / Logradouro:</label>
                <input
                  type="text"
                  placeholder="Nome da sua rua ou avenida"
                  value={customerData.logradouro}
                  onChange={(e) => handleCustomerChange('logradouro', e.target.value)}
                  className="w-full bg-black border border-white/10 text-white text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-[#942620]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-300 mb-1">Bairro:</label>
                <input
                  type="text"
                  placeholder="Seu bairro"
                  value={customerData.bairro}
                  onChange={(e) => handleCustomerChange('bairro', e.target.value)}
                  className="w-full bg-black border border-white/10 text-white text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-[#942620]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-300 mb-1">Observações (opcional):</label>
                <textarea
                  placeholder="Instruções de entrega, referências..."
                  value={customerData.observacoes}
                  onChange={(e) => handleCustomerChange('observacoes', e.target.value)}
                  rows={2}
                  className="w-full bg-black border border-white/10 text-white text-xs p-2 rounded-lg focus:outline-none focus:border-[#942620]"
                />
              </div>
            </div>
          ) : (
            /* Items List */
            cart.map((item, idx) => (
              <div
                key={`${item.product.id}-${item.selectedSize}-${idx}`}
                className="flex items-center gap-3 p-3 bg-neutral-900/60 border border-white/5 rounded-xl"
              >
                <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-black">
                  <SafeImage
                    src={item.product?.images?.[0]}
                    fallbackSrcs={item.product?.images?.slice(1)}
                    alt={item.product?.name}
                    className="w-full h-full"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-semibold text-white truncate">
                    {item.product.name}
                  </h4>
                  <p className="text-[11px] text-[#dfa666] font-medium">
                    Tamanho: <strong>{item.selectedSize}</strong>
                  </p>
                  <span className="text-xs font-bold text-white block mt-0.5">
                    R$ {item.product.price.toFixed(2).replace('.', ',')}
                  </span>
                </div>

                {/* Quantity Controls */}
                <div className="flex flex-col items-end gap-2">
                  <button
                    onClick={() => removeFromCart(item.product.id, item.selectedSize)}
                    className="text-gray-500 hover:text-red-400 transition-colors"
                    title="Remover produto"
                  >
                    <Trash2 size={16} />
                  </button>
                  <div className="flex items-center bg-black border border-white/10 rounded-lg">
                    <button
                      onClick={() => updateQuantity(item.product.id, item.selectedSize, -1)}
                      className="px-2 py-0.5 text-gray-400 hover:text-white"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="px-2 text-xs font-bold text-white">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product.id, item.selectedSize, 1)}
                      className="px-2 py-0.5 text-gray-400 hover:text-white"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Drawer Footer Summary */}
        {cart.length > 0 && (
          <div className="p-4 bg-black border-t border-white/10 space-y-3">
            
            {/* Coupon input */}
            {!showCheckoutForm && (
              <form onSubmit={handleApplyCoupon} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Cupom (ex: LITRAN10)"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  className="bg-neutral-900 border border-white/10 text-white text-xs px-3 py-2 rounded-lg flex-1 focus:outline-none focus:border-[#942620] uppercase"
                />
                <button
                  type="submit"
                  disabled={applyingCoupon}
                  className="bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-white text-xs font-bold px-3 py-2 rounded-lg border border-white/10 transition-colors flex items-center gap-1"
                >
                  <Tag size={14} /> {applyingCoupon ? '...' : 'Aplicar'}
                </button>
              </form>
            )}

            {couponMessage && (
              <p className={`text-[11px] font-medium ${couponMessage.success ? 'text-green-400' : 'text-red-400'}`}>
                {couponMessage.message}
              </p>
            )}

            {coupon && (
              <div className="flex items-center justify-between text-xs text-green-400 bg-green-950/40 p-2.5 rounded-lg border border-green-800/40">
                <div className="flex items-center gap-2">
                  <Tag size={14} className="text-green-400" />
                  <span>Cupom <strong>{coupon}</strong> ({discountPercent}% OFF) aplicado</span>
                </div>
                <button onClick={removeCoupon} className="text-xs text-red-400 underline hover:text-red-300">
                  Remover
                </button>
              </div>
            )}

            {/* Totals Breakdown */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-gray-400">
                <span>Subtotal:</span>
                <span>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
              </div>
              {discountValue > 0 && (
                <div className="flex justify-between text-green-400 font-semibold">
                  <span>Desconto ({coupon} - {discountPercent}%):</span>
                  <span>- R$ {discountValue.toFixed(2).replace('.', ',')}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-400">
                <span>Frete:</span>
                <span>{isFreeShippingEligible ? 'GRÁTIS' : 'A combinar'}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-white/10">
                <span>Total:</span>
                <span className="text-lg text-[#dfa666]">R$ {total.toFixed(2).replace('.', ',')}</span>
              </div>
            </div>

            {/* Action Buttons */}
            {!showCheckoutForm ? (
              <button
                onClick={() => setShowCheckoutForm(true)}
                className="w-full bg-[#942620] hover:bg-[#b52e27] text-white py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-[#942620]/40 transition-all hover:translate-x-0.5"
              >
                <span>Continuar para Entrega</span>
                <ArrowRight size={16} />
              </button>
            ) : (
              <a
                href={checkoutWhatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-green-600 hover:bg-green-500 text-white py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-green-600/40 transition-all hover:scale-[1.01]"
              >
                <Send size={16} />
                <span>Finalizar Pedido via WhatsApp</span>
              </a>
            )}

            <div className="text-[10px] text-gray-500 text-center flex items-center justify-center gap-1 pt-1">
              <ShieldCheck size={12} className="text-[#dfa666]" />
              <span>Compra 100% Segura</span>
            </div>

          </div>
        )}

      </aside>
    </div>
  );
};
