import React, { useState, useEffect } from 'react';
import { SlidersHorizontal, PackageX, ChevronDown } from 'lucide-react';
import { CATEGORIES } from '../data/catalogData';
import { useProducts } from '../context/ProductContext';
import { ProductCard } from './ProductCard';

const INITIAL_VISIBLE_COUNT = 16;

export const ProductGrid = ({ activeCategory, onQuickView, searchQuery }) => {
  const { products } = useProducts();
  const [sortBy, setSortBy] = useState('relevancia');
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);

  // Reinicia a paginação sempre que mudar de categoria ou termo de busca
  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE_COUNT);
  }, [activeCategory, searchQuery, sortBy]);

  const filteredProducts = products.filter((product) => {
    const catLower = (activeCategory || '').toLowerCase();
    const nameLower = (product.name || '').toLowerCase();
    const prodCatLower = (product.category || '').toLowerCase();
    const subCatLower = (product.subcategory || '').toLowerCase();

    let matchesCategory =
      activeCategory === 'inicio' ||
      activeCategory === 'todos' ||
      prodCatLower === catLower;

    if (!matchesCategory) {
      if (catLower === 'suplementos') {
        matchesCategory = prodCatLower === 'suplementos' || nameLower.includes('creatina') || nameLower.includes('my slim') || nameLower.includes('chá action') || nameLower.includes('detox caps') || nameLower.includes('coffee action');
      } else if (catLower === 'moda-fitness') {
        matchesCategory =
          prodCatLower === 'moda-fitness' ||
          prodCatLower === 'blusas' ||
          prodCatLower === 'camisetas' ||
          nameLower.includes('calça') ||
          nameLower.includes('short') ||
          nameLower.includes('macacão') ||
          nameLower.includes('jaqueta') ||
          nameLower.includes('regata') ||
          nameLower.includes('bolero') ||
          nameLower.includes('conjunto') ||
          nameLower.includes('calcinha');
      } else if (catLower === 'blusas') {
        matchesCategory =
          nameLower.includes('blusa') ||
          subCatLower.includes('blusa') ||
          nameLower.includes('regata') ||
          nameLower.includes('bolero') ||
          nameLower.includes('top');
      } else if (catLower === 'camisetas') {
        matchesCategory =
          nameLower.includes('camiseta') ||
          nameLower.includes('camisa') ||
          subCatLower.includes('camiseta');
      } else if (catLower === 'acessorios') {
        matchesCategory =
          prodCatLower.includes('acessorio') ||
          nameLower.includes('óculos') ||
          nameLower.includes('faixa') ||
          nameLower.includes('acessório');
      }
    }

    const matchesSearch =
      !searchQuery ||
      nameLower.includes(searchQuery.toLowerCase()) ||
      prodCatLower.includes(searchQuery.toLowerCase()) ||
      (product.brand && product.brand.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (product.sku && product.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (product.description && product.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (product.variations && product.variations.some(v =>
        (v.name && v.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (v.color && v.color.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (v.size && v.size.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (v.sku && v.sku.toLowerCase().includes(searchQuery.toLowerCase()))
      ));

    return matchesCategory && matchesSearch;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'menor-preco') return (a.price || 0) - (b.price || 0);
    if (sortBy === 'maior-preco') return (b.price || 0) - (a.price || 0);
    if (sortBy === 'avaliacao') return (b.rating || 0) - (a.rating || 0);
    return String(a.name || '').localeCompare(String(b.name || ''));
  });

  const visibleProducts = sortedProducts.slice(0, visibleCount);

  const activeCategoryObj = CATEGORIES.find((c) => c.id === activeCategory);
  
  const categoryTitles = {
    'inicio': 'TODOS OS PRODUTOS DA LOJA',
    'camisetas': 'CAMISETA',
    'blusas': 'BLUSA & TOP',
    'acessorios': 'ACESSÓRIOS',
    'moda-fitness': 'MODA FITNESS',
    'suplementos': 'SUPLEMENTOS',
    'muay-thai': 'MUAY THAI',
    'mma': 'MMA',
    'jiu-jitsu': 'JIU-JITSU'
  };

  const titleToDisplay = categoryTitles[activeCategory] || (activeCategoryObj ? activeCategoryObj.name : 'CATÁLOGO LITRAN');

  return (
    <section id="catalogo" className="py-10 bg-black min-h-[500px]">
      <div className="container">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-4 border-b border-white/10">
          <div>
            <h2 className="text-xl sm:text-3xl font-black text-white tracking-wide uppercase flex items-center gap-3">
              <span className="w-2.5 h-7 bg-[#942620] rounded-full inline-block" />
              {titleToDisplay}
            </h2>
            <p className="text-xs text-gray-400 mt-1 font-medium">
              Mostrando {visibleProducts.length} de {sortedProducts.length} produto(s) disponível(is)
            </p>
          </div>

          {/* Sorting control */}
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={18} className="text-[#dfa666]" />
            <span className="text-xs text-gray-400 font-bold uppercase">Ordenar por:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-neutral-900 border border-white/15 text-white text-xs font-bold rounded-xl p-2.5 focus:outline-none focus:border-[#942620] cursor-pointer"
            >
              <option value="relevancia">Ordem Alfabética</option>
              <option value="menor-preco">Menor Preço</option>
              <option value="maior-preco">Maior Preço</option>
              <option value="avaliacao">Melhores Avaliados</option>
            </select>
          </div>
        </div>

        {/* Product Cards Grid */}
        {sortedProducts.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
              {visibleProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onQuickView={onQuickView}
                />
              ))}
            </div>

            {/* Botão Carregar Mais */}
            {visibleCount < sortedProducts.length && (
              <div className="mt-12 text-center">
                <button
                  onClick={() => setVisibleCount((prev) => prev + 16)}
                  className="px-8 py-3.5 bg-neutral-900 hover:bg-neutral-800 border border-white/20 hover:border-white/40 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl transition-all hover:scale-105 active:scale-95 inline-flex items-center gap-2"
                >
                  <ChevronDown size={16} className="text-[#dfa666]" />
                  <span>Carregar mais produtos</span>
                  <span className="text-[#dfa666] font-mono text-[11px]">
                    ({sortedProducts.length - visibleCount} restantes)
                  </span>
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="py-20 text-center bg-neutral-900/40 rounded-3xl border border-white/10 my-8 shadow-2xl">
            <PackageX size={56} className="mx-auto text-[#942620] mb-4" />
            <h3 className="text-xl font-black text-white mb-2 uppercase">Nenhum produto nesta categoria</h3>
            <p className="text-sm text-gray-400 max-w-md mx-auto">
              Não encontramos produtos para esta seleção no momento. Navegue pelas nossas outras categorias no menu.
            </p>
          </div>
        )}

      </div>
    </section>
  );
};
