import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const FavoritesContext = createContext();

export const FavoritesProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [favorites, setFavorites] = useState([]);

  // Carregar favoritos do usuário logado
  useEffect(() => {
    if (isAuthenticated && user && (user.id || user.email)) {
      try {
        const key = `litran_favorites_${user.id || user.email}`;
        const saved = localStorage.getItem(key);
        setFavorites(saved ? JSON.parse(saved) : []);
      } catch (e) {
        setFavorites([]);
      }
    } else {
      setFavorites([]);
    }
  }, [isAuthenticated, user]);

  const saveFavorites = (newFavs) => {
    setFavorites(newFavs);
    if (user && (user.id || user.email)) {
      const key = `litran_favorites_${user.id || user.email}`;
      localStorage.setItem(key, JSON.stringify(newFavs));
    }
  };

  const isFavorite = (productId) => {
    return favorites.some(p => String(p.id) === String(productId));
  };

  const toggleFavorite = (product) => {
    if (!isAuthenticated || !user) {
      return {
        success: false,
        requireLogin: true,
        message: 'Você precisa estar conectado à sua conta para salvar produtos nos favoritos.'
      };
    }

    const exists = isFavorite(product.id);
    let updated;
    if (exists) {
      updated = favorites.filter(p => String(p.id) !== String(product.id));
      saveFavorites(updated);
      return {
        success: true,
        isFav: false,
        message: `"${product.name}" removido dos seus favoritos.`
      };
    } else {
      const itemToSave = {
        id: product.id,
        name: product.name,
        price: product.price,
        originalPrice: product.originalPrice,
        sku: product.sku || product.refCode || String(product.id),
        images: product.images || [],
        subcategory: product.subcategory || 'MODA FITNESS',
        addedAt: new Date().toISOString()
      };
      updated = [itemToSave, ...favorites];
      saveFavorites(updated);
      return {
        success: true,
        isFav: true,
        message: `"${product.name}" adicionado aos seus favoritos!`
      };
    }
  };

  const removeFavorite = (productId) => {
    const updated = favorites.filter(p => String(p.id) !== String(productId));
    saveFavorites(updated);
  };

  return (
    <FavoritesContext.Provider
      value={{
        favorites,
        toggleFavorite,
        isFavorite,
        removeFavorite,
        count: favorites.length
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (!context) {
    return {
      favorites: [],
      toggleFavorite: () => ({ success: false, requireLogin: true }),
      isFavorite: () => false,
      removeFavorite: () => {},
      count: 0
    };
  }
  return context;
};
