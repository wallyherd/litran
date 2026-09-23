import React, { useState, useEffect } from 'react';
import { ImageOff } from 'lucide-react';

/**
 * SafeImage - Robust image component with:
 * 1. Automatic fallback cycling (tries src, then each item in fallbackSrcs)
 * 2. Mobile-optimized referrerPolicy ('no-referrer') to prevent mobile CDN blocking
 * 3. Lazy loading and async decoding
 * 4. Shimmer loading skeleton
 * 5. Elegant placeholder UI if all image URLs fail
 */
export const SafeImage = ({
  src,
  fallbackSrcs = [],
  alt = '',
  className = '',
  imgClassName = '',
  loading = 'lazy',
  decoding = 'async',
  referrerPolicy = 'no-referrer',
  showPlaceholderOnFail = true,
  onClick,
  ...props
}) => {
  // Normalize candidate list of URLs
  const rawCandidates = [
    src,
    ...(Array.isArray(fallbackSrcs) ? fallbackSrcs : [fallbackSrcs])
  ];
  
  const candidates = rawCandidates.filter(
    (url) => Boolean(url) && typeof url === 'string' && url.trim().length > 0
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Reset states when the primary src or candidates change
  useEffect(() => {
    setCurrentIndex(0);
    setHasError(candidates.length === 0);
    setIsLoaded(false);
  }, [src, JSON.stringify(fallbackSrcs)]);

  const currentSrc = candidates[currentIndex];

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
        <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center mb-1 text-[#dfa666] shadow">
          <ImageOff size={20} />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 line-clamp-1">
          {alt || 'LITRAN'}
        </span>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`relative w-full h-full overflow-hidden bg-neutral-100 dark:bg-neutral-900 ${className}`}
    >
      {/* Loading Skeleton */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 dark:from-neutral-800 dark:via-neutral-700 dark:to-neutral-800 animate-pulse z-0" />
      )}
      <img
        src={currentSrc}
        alt={alt}
        loading={loading}
        decoding={decoding}
        referrerPolicy={referrerPolicy}
        onError={handleError}
        onLoad={handleLoad}
        className={`w-full h-full object-cover transition-opacity duration-300 relative z-10 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        } ${imgClassName}`}
        {...props}
      />
    </div>
  );
};
