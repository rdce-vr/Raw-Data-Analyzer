import React from 'react';

interface PlnLogoProps {
  height?: number;
}

export function PlnLogo({ height = 44 }: PlnLogoProps) {
  return (
    <div className="flex items-center" style={{ height: `${height}px` }}>
      {/* A high fidelity representation of PLN Icon Plus vector logo */}
      <svg
        height={height}
        viewBox="0 0 160 50"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        referrerPolicy="no-referrer"
      >
        {/* Background / Emblem shape */}
        <g transform="scale(0.8) translate(5, 5)">
          {/* Cyan electric arc element */}
          <path
            d="M 5 22 L 20 2 L 15 14 L 28 8 L 10 32 L 12 18 Z"
            fill="#00AFF0"
          />
          {/* Yellow spark element */}
          <circle cx="28" cy="8" r="3" fill="#fbbf24" />
        </g>
        
        {/* Text element to simulate the PLN Icon Plus logo branding */}
        <text
          x="42"
          y="25"
          fontFamily="Inter, sans-serif"
          fontWeight="900"
          fontSize="22"
          fill="#00AFF0"
          letterSpacing="1"
        >
          PLN
        </text>
        <text
          x="42"
          y="42"
          fontFamily="Inter, sans-serif"
          fontWeight="600"
          fontSize="14"
          fill="#2E4D58"
          letterSpacing="0.5"
        >
          Icon Plus
        </text>
      </svg>
    </div>
  );
}
