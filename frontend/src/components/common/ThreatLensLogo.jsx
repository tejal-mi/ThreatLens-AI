import React from "react";

export function ThreatLensLogo({
  className = "h-7 w-auto",
  idPrefix = "tl",
  showBadge = false,
  showText = true,
  iconOnly = false,
  height,
  width,
}) {
  const gradId = `${idPrefix}-emblem-grad`;
  const accentGradId = `${idPrefix}-accent-grad`;

  const EmblemIcon = (
    <svg
      viewBox="0 0 44 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-full w-auto aspect-square shrink-0"
      aria-hidden="true"
    >
      <defs>
        {/* Main Palette Gradient */}
        <linearGradient id={gradId} x1="4" y1="4" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6EA8DA" />
          <stop offset="50%" stopColor="#2C6CB0" />
          <stop offset="100%" stopColor="#1D3557" />
        </linearGradient>

        {/* Secondary Palette Gradient */}
        <linearGradient id={accentGradId} x1="22" y1="8" x2="38" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6EA8DA" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#2C6CB0" stopOpacity="0.5" />
        </linearGradient>
      </defs>

      {/* Outer Hexagonal Shield Frame */}
      <path
        d="M22 3.5L38.5 13V31L22 40.5L5.5 31V13L22 3.5Z"
        fill="#070c18"
        stroke={`url(#${gradId})`}
        strokeWidth="1.75"
        strokeLinejoin="round"
      />

      {/* Faceted Top-Right Shard */}
      <path
        d="M22 3.5L38.5 13L28.5 22L22 15V3.5Z"
        fill={`url(#${accentGradId})`}
        opacity="0.85"
      />

      {/* Faceted Left Shard */}
      <path
        d="M5.5 13L22 3.5V15L12 24.5L5.5 13Z"
        fill={`url(#${gradId})`}
        opacity="0.9"
      />

      {/* Bottom Anchor Facet */}
      <path
        d="M22 40.5L5.5 31L16 26L22 30L28 26L38.5 31L22 40.5Z"
        fill="#0a162e"
        stroke={`url(#${gradId})`}
        strokeWidth="1"
        opacity="0.9"
      />

      {/* Central Diamond Lens Core */}
      <polygon
        points="22,12 30,22 22,32 14,22"
        fill="#040814"
        stroke={`url(#${gradId})`}
        strokeWidth="1.5"
      />

      {/* Focal Lens Aperture */}
      <circle cx="22" cy="22" r="3" fill="#6EA8DA" />
      <circle cx="22" cy="22" r="1.5" fill="#FFFFFF" />

      {/* Precision Scan Line */}
      <line x1="8" y1="22" x2="36" y2="22" stroke="#6EA8DA" strokeWidth="0.75" strokeDasharray="1.5 2" opacity="0.65" />
    </svg>
  );

  if (iconOnly || !showText) {
    return (
      <span className={`inline-flex items-center justify-center ${className}`} style={{ height, width }}>
        {EmblemIcon}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-2.5 select-none ${className}`}
      style={{ height, width }}
      role="img"
      aria-label="ThreatLens"
    >
      {EmblemIcon}
      <span className="flex items-center tracking-tight font-sans leading-none">
        <span className="font-extrabold text-[1.05rem] text-white tracking-[-0.02em]">
          Threat
        </span>
        <span className="font-extrabold text-[1.05rem] text-[#6EA8DA] tracking-[-0.02em]">
          Lens
        </span>
        {showBadge && (
          <span className="ml-1.5 px-1.5 py-0.5 rounded-[4px] text-[9px] font-sans font-bold tracking-wider uppercase bg-[#1D3557] text-[#6EA8DA] border border-[#2C6CB0]/40">
            AI
          </span>
        )}
      </span>
    </span>
  );
}

export default ThreatLensLogo;

