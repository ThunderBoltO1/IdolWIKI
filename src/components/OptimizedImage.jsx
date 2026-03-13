import React, { useState, useEffect } from 'react';
import { cn } from '../lib/utils';
import { ImageIcon } from 'lucide-react';

export function OptimizedImage({ src, alt, className, containerClassName, ...props }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
  }, [src]);

  return (
    <div className={cn("relative overflow-hidden bg-slate-200 dark:bg-slate-800", containerClassName, className)}>
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 max-w-full animate-pulse bg-slate-300 dark:bg-slate-700" />
      )}
      {hasError ? (
        <div className="absolute inset-0 flex items-center justify-center text-slate-400 bg-slate-200 dark:bg-slate-800">
           <ImageIcon className="w-8 h-8 opacity-50" />
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          className={cn(
            "w-full h-full object-cover transition-opacity duration-500",
            isLoaded ? "opacity-100" : "opacity-0",
          )}
          loading="lazy"
          {...props}
        />
      )}
    </div>
  );
}
