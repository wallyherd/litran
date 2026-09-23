import React from 'react';
import { CATEGORY_CIRCLES } from '../data/catalogData';

export const CategoryCircles = ({ activeCategory, onSelectCategory }) => {
  return (
    <section className="py-12 sm:py-16 bg-black border-t border-b border-white/10">
      <div className="container">
        <div className="flex items-center gap-6 sm:gap-10 overflow-x-auto pb-4 scrollbar-none justify-start sm:justify-center px-2">
          {CATEGORY_CIRCLES.map((cat) => {
            const isActive = activeCategory === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className="flex flex-col items-center gap-3 group flex-shrink-0 focus:outline-none"
              >
                <div
                  className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full p-1 transition-all ${
                    isActive
                      ? 'ring-2 ring-white scale-105 shadow-xl shadow-white/20'
                      : 'ring-1 ring-white/40 group-hover:ring-white group-hover:scale-105'
                  }`}
                >
                  <img
                    src={cat.image}
                    alt={cat.name}
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/categories/cat-moda-fitness.jpg';
                    }}
                    className="w-full h-full rounded-full object-cover bg-neutral-900"
                  />
                </div>
                <span
                  className={`text-xs font-bold text-center uppercase tracking-wider transition-colors ${
                    isActive ? 'text-white underline' : 'text-gray-300 group-hover:text-white'
                  }`}
                >
                  {cat.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
