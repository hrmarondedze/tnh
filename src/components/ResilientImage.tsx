import React, { useState } from "react";
import { Compass } from "lucide-react";

interface ResilientImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  dataSaverMode?: boolean;
  fallbackLabel?: string;
}

export const ResilientImage: React.FC<ResilientImageProps> = ({
  src,
  alt,
  className = "w-full h-48 object-cover",
  dataSaverMode = false,
  fallbackLabel,
}) => {
  const [hasError, setHasError] = useState(false);
  const [revealedInDataSaver, setRevealedInDataSaver] = useState(false);

  if (!src || hasError) {
    return (
      <div
        className={`bg-gradient-to-br from-[#163A2B] via-[#1E4D38] to-[#275943] text-[#FAF7F2] flex flex-col items-center justify-center p-4 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <Compass className="w-6 h-6 text-[#D4AF37] mb-1.5 opacity-90" />
        <span className="text-xs font-medium tracking-tight line-clamp-2 max-w-[22ch] text-[#FAF7F2]/90">
          {fallbackLabel || alt || "TourBridge Zimbabwe"}
        </span>
      </div>
    );
  }

  if (dataSaverMode && !revealedInDataSaver) {
    return (
      <div
        className={`bg-[#F1ECE1] border border-[#E6E0D3] text-[#14241B] flex flex-col items-center justify-center p-4 text-center ${className}`}
      >
        <p className="text-xs text-[#4A5B50] mb-2">
          Image paused by Data-Saver Mode ({alt})
        </p>
        <button
          type="button"
          onClick={() => setRevealedInDataSaver(true)}
          className="px-3 py-1.5 min-h-[36px] text-xs font-medium bg-[#163A2B] text-[#FAF7F2] rounded-lg hover:bg-[#1E4D38] transition-colors whitespace-nowrap"
        >
          Load Media
        </button>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
    />
  );
};
