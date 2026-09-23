import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const PromoBanner = ({ onSelectCategory }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const promoSlides = [
    {
      id: 1,
      image: '/banners/promo1.png',
      alt: 'Creatina 100% pura - Força que dura, desempenho que evolui',
      categoryId: 'suplementos'
    },
    {
      id: 2,
      image: '/banners/promo2.png',
      alt: 'Acelera a queima 100% NATURAL - Litran',
      categoryId: 'suplementos'
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % promoSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [promoSlides.length]);

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? promoSlides.length - 1 : prev - 1));
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % promoSlides.length);
  };

  return (
    <section className="bg-black w-full overflow-hidden border-t border-b border-white/10 my-6 relative">
      
      {/* Container Rotativo com Enquadramento Perfeito (Sem Cortes e Nitidez Máxima) */}
      <div className="relative w-full bg-black">
        
        <div
          onClick={() => onSelectCategory(promoSlides[currentSlide].categoryId)}
          className="relative w-full cursor-pointer group overflow-hidden bg-black flex items-center justify-center"
        >
          {/* Imagem do Banner Promocional com Ajuste Nítido e Zero Corte Lateral */}
          <img
            src={promoSlides[currentSlide].image}
            alt={promoSlides[currentSlide].alt}
            className="w-full h-auto max-h-[500px] object-contain block mx-auto transition-opacity duration-500 shadow-2xl"
          />
        </div>

        {/* Setas de Navegação Lateral */}
        <button
          onClick={prevSlide}
          className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-black/80 border border-white/30 text-white hover:bg-black hover:border-white flex items-center justify-center transition-all backdrop-blur-md shadow-2xl"
          aria-label="Slide anterior"
        >
          <ChevronLeft size={24} />
        </button>

        <button
          onClick={nextSlide}
          className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-black/80 border border-white/30 text-white hover:bg-black hover:border-white flex items-center justify-center transition-all backdrop-blur-md shadow-2xl"
          aria-label="Próximo slide"
        >
          <ChevronRight size={24} />
        </button>

        {/* Pontos Indicadores de Posição */}
        <div className="absolute bottom-4 left-0 right-0 z-20 flex items-center justify-center gap-2">
          {promoSlides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              className={`h-2.5 rounded-full transition-all ${
                currentSlide === idx ? 'w-8 bg-[#942620]' : 'w-2.5 bg-white/40 hover:bg-white/70'
              }`}
              aria-label={`Ir para slide ${idx + 1}`}
            />
          ))}
        </div>

      </div>

    </section>
  );
};
