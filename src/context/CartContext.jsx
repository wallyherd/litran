import React, { createContext, useContext, useState, useEffect } from 'react';
import { STORE_CONFIG } from '../data/catalogData';
import { API_BASE } from '../config/api';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem('litran_cart');
    return saved ? JSON.parse(saved) : [];
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [coupon, setCoupon] = useState(() => localStorage.getItem('litran_applied_coupon') || '');
  const [discountPercent, setDiscountPercent] = useState(() => {
    const saved = localStorage.getItem('litran_applied_discount');
    return saved ? parseFloat(saved) : 0;
  });
  const [couponsList, setCouponsList] = useState([]);

  const [customerData, setCustomerData] = useState(() => {
    const saved = localStorage.getItem('litran_customer');
    return saved ? JSON.parse(saved) : {
      nome: '',
      whatsapp: '',
      cep: '',
      logradouro: '',
      numero: '',
      bairro: '',
      cidade: '',
      observacoes: ''
    };
  });

  useEffect(() => {
    localStorage.setItem('litran_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('litran_customer', JSON.stringify(customerData));
  }, [customerData]);

  const addToCart = (product, selectedSize, quantity = 1) => {
    const sizeToUse = selectedSize || (product.sizes && product.sizes[0]) || 'Único';
    
    setCart(prev => {
      const existingIndex = prev.findIndex(
        item => item.product.id === product.id && item.selectedSize === sizeToUse
      );
      
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex].quantity += quantity;
        return updated;
      } else {
        return [...prev, { product, selectedSize: sizeToUse, quantity }];
      }
    });

    setIsCartOpen(true);
  };

  const removeFromCart = (productId, selectedSize) => {
    setCart(prev => prev.filter(item => !(item.product.id === productId && item.selectedSize === selectedSize)));
  };

  const updateQuantity = (productId, selectedSize, delta) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId && item.selectedSize === selectedSize) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : item;
      }
      return item;
    }));
  };

  const clearCart = () => {
    setCart([]);
  };

  // Carregar cupons do servidor e manter em cache
  useEffect(() => {
    const fetchLiveCoupons = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/coupons`);
        if (res.ok) {
          const data = await res.json();
          if (data.coupons && Array.isArray(data.coupons)) {
            setCouponsList(data.coupons);
          }
        }
      } catch (err) {
        console.warn('Usando validação de cupom em memória/fallback local.');
      }
    };
    fetchLiveCoupons();
  }, []);

  useEffect(() => {
    if (coupon) {
      localStorage.setItem('litran_applied_coupon', coupon);
      localStorage.setItem('litran_applied_discount', String(discountPercent));
    } else {
      localStorage.removeItem('litran_applied_coupon');
      localStorage.removeItem('litran_applied_discount');
    }
  }, [coupon, discountPercent]);

  const applyCoupon = async (code) => {
    if (!code || typeof code !== 'string') {
      return { success: false, message: 'Digite um código de cupom.' };
    }
    const cleanCode = code.trim().toUpperCase();

    // 1. Tentar validar via API em tempo real
    try {
      const res = await fetch(`${API_BASE}/api/coupons/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: cleanCode })
      });

      const data = await res.json();
      if (res.ok && data.valid) {
        setCoupon(data.code);
        setDiscountPercent(data.discountPercent);
        return {
          success: true,
          message: data.message || `Cupom ${data.code} de ${data.discountPercent}% aplicado com sucesso!`
        };
      } else {
        return {
          success: false,
          message: data.message || 'Cupom inválido ou inativo.'
        };
      }
    } catch (err) {
      // 2. Fallback offline / cache
      const found = couponsList.find(c => c.code.toUpperCase() === cleanCode);
      if (found) {
        if (!found.isActive) {
          return { success: false, message: `O cupom ${found.code} está inativo.` };
        }
        setCoupon(found.code);
        setDiscountPercent(found.discountPercent);
        return {
          success: true,
          message: `Cupom ${found.code} de ${found.discountPercent}% aplicado com sucesso!`
        };
      }

      // 3. Fallbacks estáticos padrão caso o servidor não responda
      if (cleanCode === 'LITRAN20') {
        setCoupon('LITRAN20');
        setDiscountPercent(20);
        return { success: true, message: 'Cupom LITRAN20 de 20% de desconto aplicado com sucesso!' };
      } else if (cleanCode === 'LITRAN10' || cleanCode === 'HDSOLUCOES') {
        setCoupon(cleanCode);
        setDiscountPercent(10);
        return { success: true, message: 'Cupom de 10% de desconto aplicado com sucesso!' };
      } else if (cleanCode === 'PRIMEIRACOMPRA') {
        setCoupon(cleanCode);
        setDiscountPercent(15);
        return { success: true, message: 'Cupom de 15% de desconto de primeira compra aplicado!' };
      }

      return { success: false, message: 'Cupom inválido ou expirado.' };
    }
  };

  const removeCoupon = () => {
    setCoupon('');
    setDiscountPercent(0);
  };

  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
  const discountValue = (subtotal * discountPercent) / 100;
  const total = Math.max(0, subtotal - discountValue);
  const remainingForFreeShipping = Math.max(0, STORE_CONFIG.freteGratisMinimo - subtotal);
  const isFreeShippingEligible = subtotal >= STORE_CONFIG.freteGratisMinimo;

  const generateWhatsAppMessage = () => {
    if (cart.length === 0) return '';

    let message = `🛒 *NOVO PEDIDO - LITRAN MODA ESPORTIVA*\n`;
    message += `------------------------------------\n\n`;
    
    message += `👤 *CLIENTE:*\n`;
    message += `• Nome: ${customerData.nome || 'Não informado'}\n`;
    message += `• WhatsApp: ${customerData.whatsapp || 'Não informado'}\n`;
    if (customerData.logradouro) {
      message += `• Endereço: ${customerData.logradouro}, Nº ${customerData.numero || 'S/N'}\n`;
      message += `• Bairro: ${customerData.bairro || '-'}, CEP: ${customerData.cep || '-'}\n`;
    }
    message += `\n📦 *ITENS DO PEDIDO:*\n`;

    cart.forEach((item, index) => {
      const itemTotal = (item.product.price * item.quantity).toFixed(2).replace('.', ',');
      message += `${index + 1}. *${item.product.name}*\n`;
      message += `   Tamanho: *${item.selectedSize}* | Qtd: *${item.quantity}x* | R$ ${itemTotal}\n`;
    });

    message += `\n------------------------------------\n`;
    message += `💰 Subtotal: R$ ${subtotal.toFixed(2).replace('.', ',')}\n`;
    if (discountValue > 0 && coupon) {
      message += `🏷️ *Cupom de Desconto:* ${coupon} (${discountPercent}% OFF)\n`;
      message += `🏷️ *Desconto Aplicado:* - R$ ${discountValue.toFixed(2).replace('.', ',')}\n`;
    }
    message += `🚚 Frete: ${isFreeShippingEligible ? '*GRÁTIS*' : 'A combinar'}\n`;
    message += `💳 *TOTAL FINAL: R$ ${total.toFixed(2).replace('.', ',')}*\n`;

    if (customerData.observacoes) {
      message += `\n📝 Observações: ${customerData.observacoes}\n`;
    }

    return encodeURIComponent(message);
  };

  const checkoutWhatsAppUrl = `https://wa.me/${STORE_CONFIG.whatsapp}?text=${generateWhatsAppMessage()}`;

  return (
    <CartContext.Provider value={{
      cart,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      isCartOpen,
      setIsCartOpen,
      totalItems,
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
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
