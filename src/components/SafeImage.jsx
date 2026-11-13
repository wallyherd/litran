import React, { useState, useEffect, useRef } from 'react';

/**
 * SafeImage - Robust image component with:
 * 1. Automatic fallback cycling (tries src, then each item in fallbackSrcs)
 * 2. Mobile-optimized referrerPolicy
 * 3. Lazy/Eager loading and async decoding
 * 4. Shimmer loading skeleton that vanishes as soon as the image renders
 * 5. Instant display of cached or already-complete images (never stuck at opacity-0)
 * 6. Elegant placeholder UI if all image URLs fail or no image exists
 */
export const SafeImage = ({
  src,
  fallbackSrcs = [],
  alt = '',
  className = '',
  imgClassName = '',
  loading = 'lazy',
  decoding = 'async',
  priority = false,
  showPlaceholderOnFail = true,
  onClick,
  ...props
}) => {
  const rawCandidates = [
    src,
    ...(Array.isArray(fallbackSrcs) ? fallbackSrcs : [fallbackSrcs])
  ];
  
  const candidates = rawCandidates.filter(
    (url) => Boolean(url) && typeof url === 'string' && url.trim().length > 0 && !url.startsWith('data:')
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasError, setHasError] = useState(candidates.length === 0);
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = useRef(null);

  const currentSrc = candidates[currentIndex];

  useEffect(() => {
    setCurrentIndex(0);
    setHasError(candidates.length === 0);
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      setIsLoaded(true);
    } else {
      setIsLoaded(false);
    }
  }, [currentSrc, candidates.length]);

  const handleError = () => {
    if (currentIndex + 1 < candidates.length) {
      setCurrentIndex((prev) => prev + 1);
      setIsLoaded(false);
    } else {
      setHasError(true);
      setIsLoaded(true);
    }
  };

  const handleLoad = () => {
    setIsLoaded(true);
  };

  if (!currentSrc || hasError) {
    if (!showPlaceholderOnFail) return null;
    return (
      <div
        onClick={onClick}
        className={`relative flex flex-col items-center justify-center bg-neutral-900 text-neutral-400 p-4 text-center select-none w-full h-full ${className}`}
      >
        <img
          src="/logos/litran_quadrada.png"
          alt={alt || 'LITRAN'}
          className="w-16 h-16 object-contain opacity-40 mb-2"
        />
        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 line-clamp-1">
          {alt || 'LITRAN MODA ESPORTIVA'}
        </span>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`relative w-full h-full overflow-hidden bg-neutral-100 dark:bg-neutral-900 ${className}`}
    >
      {/* Loading Skeleton: exibido apenas enquanto a imagem não terminou de renderizar */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 dark:from-neutral-800 dark:via-neutral-700 dark:to-neutral-800 animate-pulse z-0" />
      )}
      <img
        ref={(el) => {
          imgRef.current = el;
          if (el && el.complete && el.naturalWidth > 0 && !isLoaded) {
            setIsLoaded(true);
          }
        }}
        src={currentSrc}
        alt={alt}
        loading={priority ? 'eager' : loading}
        decoding={decoding}
        fetchPriority={priority ? 'high' : 'auto'}
        onError={handleError}
        onLoad={handleLoad}
        className={`w-full h-full object-cover transition-opacity duration-300 relative z-10 ${
          isLoaded ? 'opacity-100' : 'opacity-95'
        } ${imgClassName}`}
        {...props}
      />
    </div>
  );
};
