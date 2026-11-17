import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { PRODUCTS as STATIC_PRODUCTS } from '../data/catalogData';
import { API_BASE } from '../config/api';

const ProductContext = createContext();

const REMOVED_ONLINE_SKUS = new Set([
  'FZ4214566', 'FZ4214624', 'FZ4212010', 'FZ4364067', 'FZ3805329',
  'LIT-BOLERO-3709460-10', 'FZ4363589', 'FZ4364085',
  'FZ3976846', 'FZ4212150', 'LIT-CONJUN-3709906-9', 'LIT-CONJUN-3709871-8',
  'FZ4214465', 'FZ4214501', 'FZ4364028',
  'FZ3805873', 'FZ3805111', 'FZ4364087',
  'FZ4367173', 'FZ4049991', 'FZ4363587',
  'FZ4363822', 'FZ3858404', 'FZ3858402', 'FZ3858406',
  'FZ4363954', 'FZ4363820', 'FZ4364029', 'FZ3858409', 'FZ3858407', 'FZ4363969'
]);

const INITIAL_STATIC_PRODUCTS = STATIC_PRODUCTS.map(p => {
  const cleanSku = (p.sku || p.refCode?.replace('Ref: ', '') || '').trim();
  return {
    ...p,
    visibleOnline: !REMOVED_ONLINE_SKUS.has(cleanSku)
  };
});

export const ProductProvider = ({ children }) => {
  const [products, setProducts] = useState(INITIAL_STATIC_PRODUCTS);
  const [loading, setLoading] = useState(true);

  const fetchLiveProducts = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/products`);
      if (!res.ok) throw new Error('Falha ao carregar catálogo');
      const data = await res.json();

      if (Array.isArray(data) && data.length > 0) {
        const formatted = data.map((p) => {
          const catSlug = (p.category?.name || 'moda-fitness')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, '-');

          const prodColorImages = p.colorImages || {};
          const formattedVariations = (p.variants && p.variants.length > 0)
            ? p.variants.map((v) => {
                const colorImg = v.imageUrl || (v.color && prodColorImages[v.color]) || null;
                return {
                  id: v.id || v.sku,
                  name: `${v.color ? v.color.trim() + ' ' : ''}${v.size ? v.size.trim() : ''}`.trim() || 'Único',
                  size: v.size ? v.size.trim() : '',
                  color: v.color ? v.color.trim() : '',
                  imageUrl: colorImg,
                  price: v.price || p.price,
                  sku: v.sku,
                  stockAvailable: v.stockAvailable ?? v.stockQty ?? 0
                };
              })
            : [
                {
                  id: `var_${p.id}`,
                  name: 'Único',
                  size: 'Único',
                  color: '',
                  imageUrl: null,
                  price: p.price,
                  sku: p.sku,
                  stockAvailable: p.stockAvailable || 0
                }
              ];

          const imgList = (p.images && p.images.length > 0)
            ? p.images
                .map((img) => (typeof img === 'string' ? img : img.url))
                .filter((url) => url && typeof url === 'string' && !url.startsWith('data:'))
            : [];

          // Adiciona também na lista de imagens as fotos cadastradas por cor
          Object.values(prodColorImages).forEach((cUrl) => {
            if (cUrl && typeof cUrl === 'string' && !imgList.includes(cUrl)) {
              imgList.push(cUrl);
            }
          });

          return {
            id: p.id,
            name: p.name,
            brand: p.brand || 'LITRAN',
            visibleOnline: p.visibleOnline !== false && !REMOVED_ONLINE_SKUS.has(p.sku),
            refCode: `Ref: ${p.sku}`,
            sku: p.sku,
            category: catSlug,
            subcategory: p.category?.name || 'MODA FITNESS',
            price: p.promoPrice ? p.promoPrice : p.price,
            originalPrice: p.promoPrice ? p.price : null,
            rating: 5,
            reviewsCount: 12,
            description: p.description || '',
            images: imgList,
            video: p.videoUrl || null,
            colorImages: prodColorImages,
            stockAvailable: p.stockAvailable,
            variations: formattedVariations,
            sizes: (p.variants && p.variants.length > 0)
              ? Array.from(new Set(p.variants.map((v) => v.size).filter(Boolean)))
              : ['Único']
          };
        });

        setProducts(formatted);
      } else {
        setProducts(STATIC_PRODUCTS);
      }
    } catch (err) {
      console.warn('Usando catálogo em memória (fallback):', err.message);
      setProducts(STATIC_PRODUCTS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveProducts();
  }, [fetchLiveProducts]);

  return (
    <ProductContext.Provider value={{ products, loading, refreshProducts: fetchLiveProducts }}>
      {children}
    </ProductContext.Provider>
  );
};

export const useProducts = () => {
  const context = useContext(ProductContext);
  if (!context) {
    return { products: STATIC_PRODUCTS, loading: false, refreshProducts: () => {} };
  }
  return context;
};
