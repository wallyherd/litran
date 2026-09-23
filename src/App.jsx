import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProductProvider } from './context/ProductContext';

// Store Components
import { AnnouncementBar } from './components/AnnouncementBar';
import { Header } from './components/Header';
import { DesktopNav } from './components/DesktopNav';
import { MobileDrawer } from './components/MobileDrawer';
import { BannerSlider } from './components/BannerSlider';
import { CategoryCircles } from './components/CategoryCircles';
import { ProductGrid } from './components/ProductGrid';
import { PromoBanner } from './components/PromoBanner';
import { ProductModal } from './components/ProductModal';
import { SearchModal } from './components/SearchModal';
import { CartDrawer } from './components/CartDrawer';
import { AccountModal } from './components/AccountModal';
import { TrustBadges } from './components/TrustBadges';
import { Footer } from './components/Footer';
import { BottomStickyBar } from './components/BottomStickyBar';

// Modules Components
import { PdvApp } from './pdv/PdvApp';
import { AdminApp } from './admin/AdminApp';
import { LoginView } from './admin/LoginView';

function StoreView() {
  const [activeCategory, setActiveCategory] = useState('inicio');
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSelectCategory = (catId) => {
    setActiveCategory(catId);
    setSearchQuery('');
    setTimeout(() => {
      const el = document.getElementById('catalogo');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }, 50);
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans selection:bg-[#942620] selection:text-white pb-16">
      <AnnouncementBar />

      <Header
        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenAccount={() => setIsAccountOpen(true)}
      />

      <DesktopNav
        activeCategory={activeCategory}
        onSelectCategory={handleSelectCategory}
      />

      <main className="flex-1">
        <BannerSlider onSelectCategory={handleSelectCategory} />
        <CategoryCircles activeCategory={activeCategory} onSelectCategory={handleSelectCategory} />
        <ProductGrid
          activeCategory={activeCategory}
          onQuickView={(product) => setQuickViewProduct(product)}
          searchQuery={searchQuery}
        />
        <PromoBanner onSelectCategory={handleSelectCategory} />
        <TrustBadges />
      </main>

      <Footer onSelectCategory={handleSelectCategory} />
      <BottomStickyBar />

      <MobileDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        activeCategory={activeCategory}
        onSelectCategory={handleSelectCategory}
        onOpenSearch={() => setIsSearchOpen(true)}
      />

      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onQuickView={(product) => setQuickViewProduct(product)}
        onSearchSubmit={(q) => setSearchQuery(q)}
      />

      <ProductModal product={quickViewProduct} onClose={() => setQuickViewProduct(null)} />
      <CartDrawer />
      <AccountModal isOpen={isAccountOpen} onClose={() => setIsAccountOpen(false)} />
    </div>
  );
}

function ProtectedPdv() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <PdvApp /> : <LoginView />;
}

function ProtectedAdmin() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <AdminApp /> : <LoginView />;
}

export default function App() {
  return (
    <AuthProvider>
      <ProductProvider>
        <CartProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<StoreView />} />
              <Route path="/pdv" element={<ProtectedPdv />} />
              <Route path="/admin" element={<ProtectedAdmin />} />
            </Routes>
          </BrowserRouter>
        </CartProvider>
      </ProductProvider>
    </AuthProvider>
  );
}
