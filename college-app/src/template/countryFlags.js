import React from 'react';

/*
 * Lightweight inline-SVG flag icons.
 * Emoji flags render as 2-letter text ("GE", "RU") on Windows, so we draw
 * simple, recognisable flags instead. Not heraldically exact — just clear.
 */

const flags = {
  // ---- MBBS-abroad destinations ----
  georgia: (
    <>
      <rect width="24" height="16" fill="#fff" />
      <rect x="10" width="4" height="16" fill="#FF0000" />
      <rect y="6" width="24" height="4" fill="#FF0000" />
    </>
  ),
  russia: (
    <>
      <rect width="24" height="16" fill="#fff" />
      <rect y="5.33" width="24" height="5.34" fill="#0039A6" />
      <rect y="10.67" width="24" height="5.33" fill="#D52B1E" />
    </>
  ),
  kazakhstan: (
    <>
      <rect width="24" height="16" fill="#00AFCA" />
      <circle cx="12" cy="7" r="3.2" fill="#FEC50C" />
      <rect x="4" y="12.2" width="16" height="1.3" fill="#FEC50C" />
    </>
  ),
  kyrgyzstan: (
    <>
      <rect width="24" height="16" fill="#E8112D" />
      <circle cx="12" cy="8" r="3.4" fill="#FFEF00" />
      <circle cx="12" cy="8" r="1.7" fill="none" stroke="#E8112D" strokeWidth="0.5" />
    </>
  ),
  uzbekistan: (
    <>
      <rect width="24" height="16" fill="#fff" />
      <rect width="24" height="5" fill="#1EB53A" />
      <rect y="11" width="24" height="5" fill="#0099B5" />
      <rect y="4.7" width="24" height="0.7" fill="#CE1126" />
      <rect y="10.6" width="24" height="0.7" fill="#CE1126" />
    </>
  ),
  philippines: (
    <>
      <rect width="24" height="8" fill="#0038A8" />
      <rect y="8" width="24" height="8" fill="#CE1126" />
      <path d="M0 0 L10 8 L0 16 Z" fill="#fff" />
      <circle cx="3.2" cy="8" r="1.7" fill="#FCD116" />
    </>
  ),
  caribbean: (
    <>
      <rect width="24" height="16" fill="#00A9CE" />
      <circle cx="8" cy="6" r="2.6" fill="#FFD100" />
      <path d="M0 12 Q6 9 12 12 T24 12 V16 H0 Z" fill="#0077A3" />
    </>
  ),

  // ---- University partner network destinations ----
  uk: (
    <>
      <rect width="24" height="16" fill="#012169" />
      <path d="M0 0 L24 16 M24 0 L0 16" stroke="#fff" strokeWidth="3" />
      <path d="M0 0 L24 16 M24 0 L0 16" stroke="#C8102E" strokeWidth="1.5" />
      <rect x="9" width="6" height="16" fill="#fff" />
      <rect y="5" width="24" height="6" fill="#fff" />
      <rect x="10" width="4" height="16" fill="#C8102E" />
      <rect y="6" width="24" height="4" fill="#C8102E" />
    </>
  ),
  usa: (
    <>
      <rect width="24" height="16" fill="#fff" />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <rect key={i} y={i * 2.46} width="24" height="1.23" fill="#B22234" />
      ))}
      <rect width="10" height="8.6" fill="#3C3B6E" />
    </>
  ),
  canada: (
    <>
      <rect width="24" height="16" fill="#fff" />
      <rect width="6" height="16" fill="#FF0000" />
      <rect x="18" width="6" height="16" fill="#FF0000" />
      <path d="M12 4 L13 7 L15.5 6 L14 8.5 L16 9 L13 10 L13.4 12 L12 10.8 L10.6 12 L11 10 L8 9 L10 8.5 L8.5 6 L11 7 Z" fill="#FF0000" />
    </>
  ),
  germany: (
    <>
      <rect width="24" height="5.33" fill="#000" />
      <rect y="5.33" width="24" height="5.34" fill="#DD0000" />
      <rect y="10.67" width="24" height="5.33" fill="#FFCE00" />
    </>
  ),
  ireland: (
    <>
      <rect width="8" height="16" fill="#169B62" />
      <rect x="8" width="8" height="16" fill="#fff" />
      <rect x="16" width="8" height="16" fill="#FF883E" />
    </>
  ),
  netherlands: (
    <>
      <rect width="24" height="5.33" fill="#AE1C28" />
      <rect y="5.33" width="24" height="5.34" fill="#fff" />
      <rect y="10.67" width="24" height="5.33" fill="#21468B" />
    </>
  ),
  singapore: (
    <>
      <rect width="24" height="8" fill="#EF3340" />
      <rect y="8" width="24" height="8" fill="#fff" />
      <circle cx="6" cy="4" r="2.8" fill="#fff" />
      <circle cx="7.1" cy="4" r="2.5" fill="#EF3340" />
    </>
  ),
  uae: (
    <>
      <rect width="24" height="16" fill="#fff" />
      <rect width="24" height="5.33" fill="#00732F" />
      <rect y="10.67" width="24" height="5.33" fill="#000" />
      <rect width="6" height="16" fill="#FF0000" />
    </>
  ),
  france: (
    <>
      <rect width="8" height="16" fill="#0055A4" />
      <rect x="8" width="8" height="16" fill="#fff" />
      <rect x="16" width="8" height="16" fill="#EF4135" />
    </>
  ),
  china: (
    <>
      <rect width="24" height="16" fill="#EE1C25" />
      <path d="M4.5 2.2 L5.4 4.6 L7.9 4.6 L5.9 6.1 L6.7 8.5 L4.5 7 L2.3 8.5 L3.1 6.1 L1.1 4.6 L3.6 4.6 Z" fill="#FFFF00" />
      <circle cx="9.2" cy="2" r="0.8" fill="#FFFF00" />
      <circle cx="10.8" cy="3.6" r="0.8" fill="#FFFF00" />
      <circle cx="10.8" cy="5.8" r="0.8" fill="#FFFF00" />
      <circle cx="9.2" cy="7.4" r="0.8" fill="#FFFF00" />
    </>
  ),
};

const CountryFlag = ({ id, size = 20, className = '' }) => {
  const art = flags[id];
  const height = Math.round((size * 2) / 3);

  return (
    <span
      className={`country-flag ${className}`}
      style={{
        display: 'inline-flex',
        width: size,
        height,
        borderRadius: 3,
        overflow: 'hidden',
        flexShrink: 0,
        boxShadow: 'inset 0 0 0 1px rgba(15,23,42,0.12)',
      }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 16" width={size} height={height} preserveAspectRatio="xMidYMid slice">
        {art || (
          <>
            <rect width="24" height="16" fill="#E2E8F0" />
            <text x="12" y="11" textAnchor="middle" fontSize="8" fontWeight="700" fill="#64748B">
              {(id || '?').slice(0, 2).toUpperCase()}
            </text>
          </>
        )}
      </svg>
    </span>
  );
};

export default CountryFlag;
