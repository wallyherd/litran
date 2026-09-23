import React, { useState } from 'react';
import { SlidersHorizontal, PackageX } from 'lucide-react';
import { CATEGORIES } from '../data/catalogData';
import { useProducts } from '../context/ProductContext';
import { ProductCard } from './ProductCard';

export const ProductGrid = ({ activeCategory, onQuickView, searchQuery }) => {
  const { products } = useProducts();
  const [sortBy, setSortBy] = useState('relevancia');

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
        matchesCategory = prodCatLower === 'moda-fitness' || prodCatLower === 'blusas' || prodCatLower === 'camisetas';
      } else if (catLower === 'blusas') {
        matchesCategory = nameLower.includes('blusa') || subCatLower.includes('blusa');
      } else if (catLower === 'camisetas') {
        matchesCategory = nameLower.includes('camiseta') || nameLower.includes('camisa') || subCatLower.includes('camiseta');
      } else if (catLower === 'acessorios') {
        matchesCategory = prodCatLower.includes('acessorio') || nameLower.includes('óculos') || nameLower.includes('faixa') || nameLower.includes('acessório');
      }
    }

    const matchesSearch =
      !searchQuery ||
      nameLower.includes(searchQuery.toLowerCase()) ||
      prodCatLower.includes(searchQuery.toLowerCase()) ||
      (product.description && product.description.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'menor-preco') return a.price - b.price;
    if (sortBy === 'maior-preco') return b.price - a.price;
    if (sortBy === 'avaliacao') return b.rating - a.rating;
    return a.id - b.id;
  });

  const activeCategoryObj = CATEGORIES.find((c) => c.id === activeCategory);
  
  const categoryTitles = {
    'inicio': 'TODOS OS PRODUTOS DA LOJA',
    'camisetas': 'CAMISETA',
    'blusas': 'BLUSA',
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
              Mostrando {sortedProducts.length} produto(s) disponível(is)
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
              <option value="relevancia">Relevância</option>
              <option value="menor-preco">Menor Preço</option>
              <option value="maior-preco">Maior Preço</option>
              <option value="avaliacao">Melhores Avaliados</option>
            </select>
          </div>
        </div>

        {/* Product Cards Grid */}
        {sortedProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
            {sortedProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onQuickView={onQuickView}
              />
            ))}
          </div>
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
