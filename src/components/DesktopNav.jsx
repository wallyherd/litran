import React, { useState } from 'react';
import { CATEGORIES } from '../data/catalogData';

export const DesktopNav = ({ activeCategory, onSelectCategory }) => {
  const [activeDropdown, setActiveDropdown] = useState(null);

  const submenus = {
    'mais-categorias': {
      title: 'Mais Categorias',
      items: [
        {
          id: 'camisetas',
          name: 'CAMISETA',
          image: 'https://arquivos.facilzap.app.br/produtos/1775343973_615ffa91e73dd4db872f.webp'
        },
        {
          id: 'blusas',
          name: 'BLUSA',
          image: 'https://arquivos.facilzap.app.br/produtos/1786706473_6938b5e856012860c798.webp'
        },
        {
          id: 'acessorios',
          name: 'ACESSÓRIOS',
          image: 'https://arquivos.facilzap.app.br/produtos/1776817587_41059a42abcff9d7a176.webp'
        }
      ]
    },
    'moda-fitness': {
      title: 'Moda Fitness',
      items: [
        {
          id: 'moda-fitness',
          name: 'TODOS FITNESS',
          image: '/categories/cat-moda-fitness.jpg'
        },
        {
          id: 'blusas',
          name: 'TOPS & BLUSAS',
          image: 'https://arquivos.facilzap.app.br/produtos/1786706473_6938b5e856012860c798.webp'
        }
      ]
    },
    'muay-thai': {
      title: 'Muay Thai',
      items: [
        {
          id: 'muay-thai',
          name: 'TODOS MUAY THAI',
          image: '/categories/cat-muay-thai.jpg'
        }
      ]
    },
    'mma': {
      title: 'MMA',
      items: [
        {
          id: 'mma',
          name: 'BERMUDAS & COMBATE',
          image: 'https://arquivos.facilzap.app.br/produtos/1774463362_8688399ffcabc6b8495b.webp'
        }
      ]
    }
  };

  const handleCategoryClick = (cat) => {
    if (cat.hasSubmenu && submenus[cat.id]) {
      // Toggle dropdown if clicking the header button
      setActiveDropdown(activeDropdown === cat.id ? null : cat.id);
    } else {
      setActiveDropdown(null);
      onSelectCategory(cat.id);
    }
  };

  const handleItemSelect = (subId) => {
    setActiveDropdown(null);
    onSelectCategory(subId);
  };

  return (
    <div
      className="bg-[#000000] border-b border-white/10 sticky top-[75px] z-40 relative"
      onMouseLeave={() => setActiveDropdown(null)}
    >
      <nav className="hidden xl:block">
        <div className="container">
          <ul className="flex items-center justify-center gap-8 text-sm font-extrabold uppercase tracking-wider py-3">
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.id;
              const hasSub = cat.hasSubmenu && submenus[cat.id];

              return (
                <li
                  key={cat.id}
                  className="relative"
                  onMouseEnter={() => {
                    if (hasSub) setActiveDropdown(cat.id);
                  }}
                >
                  <button
                    onClick={() => handleCategoryClick(cat)}
                    className={`py-2 px-3 transition-all flex items-center gap-2 cursor-pointer ${
                      isActive || activeDropdown === cat.id
                        ? 'text-white border-b-2 border-[#942620]'
                        : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    {cat.id === 'inicio' && (
                      <span className="w-2.5 h-2.5 rounded-full bg-[#942620] inline-block" />
                    )}
                    <span>{cat.name}</span>
                    {cat.hasSubmenu && <span className="text-xs text-gray-400">▾</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      {/* DROPDOWN MENU BANNER (Matching Screenshot Exactly) */}
      {activeDropdown && submenus[activeDropdown] && (
        <div
          className="absolute top-full left-0 w-full bg-[#8b201a] border-t border-[#a82922] shadow-2xl z-50 animate-slide-down py-6"
          onMouseEnter={() => setActiveDropdown(activeDropdown)}
          onMouseLeave={() => setActiveDropdown(null)}
        >
          <div className="container max-w-5xl mx-auto px-4">
            <h4 className="text-white text-sm font-black uppercase tracking-wider mb-6 text-left border-b border-white/10 pb-2">
              {submenus[activeDropdown].title}
            </h4>

            <div className="flex items-center justify-start gap-8 flex-wrap">
              {submenus[activeDropdown].items.map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => handleItemSelect(sub.id)}
                  className="flex flex-col items-center gap-2 group cursor-pointer"
                >
                  {/* Circle image container */}
                  <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-white/30 group-hover:border-white group-hover:scale-105 transition-all shadow-lg bg-black">
                    <img
                      src={sub.image}
                      alt={sub.name}
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '/categories/cat-moda-fitness.jpg';
                      }}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Label */}
                  <span className="text-white text-[11px] font-black tracking-wider uppercase group-hover:text-amber-200 transition-colors">
                    {sub.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
