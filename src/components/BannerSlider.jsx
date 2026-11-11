import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { STORIES_VIDEOS } from '../data/catalogData';

// Componente inteligente de vídeo em loop leve com carregamento sob demanda (não trava a rede no carregamento inicial)
const LazyStoryVideo = ({ story, onSelectCategory }) => {
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (videoRef.current) {
            videoRef.current.play().catch(() => {});
          }
        } else {
          if (videoRef.current) {
            videoRef.current.pause();
          }
        }
      },
      { rootMargin: '200px 0px', threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      onClick={() => onSelectCategory('suplementos')}
      className="relative aspect-[9/16] rounded-3xl overflow-hidden bg-neutral-900 border border-white/10 cursor-pointer shadow-2xl transition-transform hover:scale-[1.02]"
    >
      <video
        ref={videoRef}
        src={inView ? story.video : undefined}
        poster={story.poster}
        preload="none"
        loop
        muted
        playsInline
        controls={false}
        onError={(e) => {
          if (story.fallbackVideo && e.target.src !== story.fallbackVideo) {
            e.target.src = story.fallbackVideo;
          }
        }}
        className="w-full h-full object-cover pointer-events-none rounded-3xl"
      />
    </div>
  );
};

export const BannerSlider = ({ onSelectCategory }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      id: 1,
      image: '/banners/banner1.png',
      alt: 'Frete Grátis na primeira compra acima de 150,00',
      categoryId: 'moda-fitness'
    },
    {
      id: 2,
      image: '/banners/banner2.png',
      alt: 'Envio Para Brasil - Litran Moda Esportiva Várzea Grande',
      categoryId: 'moda-fitness'
    },
    {
      id: 3,
      image: '/banners/banner3.png',
      alt: 'Segura no treino, leve no movimento - Litran',
      categoryId: 'moda-fitness'
    },
    {
      id: 4,
      image: '/banners/banner4.png',
      alt: 'Suplemento certo, resultado certo! - Litran',
      categoryId: 'suplementos'
    },
    {
      id: 5,
      image: '/banners/banner5.png',
      alt: 'LITRAN - Seu treino campeão em performance',
      categoryId: 'muay-thai'
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [slides.length]);

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  return (
    <section className="bg-black w-full overflow-hidden relative">
      
      {/* 1. CARROSSEL ROTATIVO DE LARGURA TOTAL COM ENQUADRAMENTO PERFEITO */}
      <div className="relative w-full bg-black">
        <div
          onClick={() => onSelectCategory(slides[currentSlide].categoryId)}
          className="relative w-full cursor-pointer group overflow-hidden bg-black flex items-center justify-center border-b border-white/10"
        >
          {/* Imagem do Banner com Enquadramento Nítido */}
          <img
            src={slides[currentSlide].image}
            alt={slides[currentSlide].alt}
            className="w-full h-auto max-h-[550px] object-contain block mx-auto transition-opacity duration-500 shadow-2xl image-render-crisp"
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
          {slides.map((_, idx) => (
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

      {/* 2. FAIXA DE ANÚNCIO LOGO ABAIXO DO BANNER ROTATIVO */}
      <div className="bg-black py-3 border-t border-b border-white/10 overflow-hidden text-xs font-black uppercase tracking-widest text-white shadow-xl">
        <div className="flex justify-around items-center opacity-90">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-[#942620] inline-block" />
            <span>FRETE GRÁTIS NA PRIMEIRA COMPRA ACIMA DE R$ 150,00</span>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-[#942620] inline-block" />
            <span>FRETE GRÁTIS NA PRIMEIRA COMPRA ACIMA DE R$ 150,00</span>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-[#942620] inline-block" />
            <span>FRETE GRÁTIS NA PRIMEIRA COMPRA ACIMA DE R$ 150,00</span>
          </div>
        </div>
      </div>

      {/* 3. ESPAÇAMENTO EXATO & SEÇÃO DOS 4 MINI VÍDEOS EM LOOP */}
      <div className="container py-12 sm:py-16">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
          {STORIES_VIDEOS.map((story) => (
            <LazyStoryVideo
              key={story.id}
              story={story}
              onSelectCategory={onSelectCategory}
            />
          ))}
        </div>
      </div>

    </section>
  );
};
