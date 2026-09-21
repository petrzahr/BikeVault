import React from "react";

interface StravaIconProps {
  className?: string;
}

export const StravaIcon: React.FC<StravaIconProps> = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
  </svg>
);

export const StravaLogo: React.FC<StravaIconProps> = ({ className = "h-8" }) => (
  <svg className={className} viewBox="0 0 132 32" fill="#FC4C02" role="img" aria-label="Strava">
    <g transform="translate(0,0) scale(1.28)">
      <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
    </g>
    <text
      x="38"
      y="25"
      fontFamily='"Plus Jakarta Sans", system-ui, sans-serif'
      fontSize="26"
      fontWeight="900"
      fontStyle="italic"
      letterSpacing="1"
    >
      STRAVA
    </text>
  </svg>
);
