import React from 'react';

interface NMSandboxLogoProps {
  className?: string;
  size?: number;
}

export const NMSandboxLogo: React.FC<NMSandboxLogoProps> = ({ className = '', size = 36 }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 40 40"
      width={size}
      height={size}
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="nm-badge-bg" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0F172A" />
          <stop offset="100%" stopColor="#050811" />
        </linearGradient>
        <linearGradient id="nm-badge-border" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#1E293B" stopOpacity="0.2" />
        </linearGradient>
        <linearGradient id="nm-n-gradient" x1="8.5" y1="13" x2="17" y2="27" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#60A5FA" />
        </linearGradient>
      </defs>

      {/* Rounded Dark Glass Badge */}
      <rect width="40" height="40" rx="10" fill="url(#nm-badge-bg)" />
      <rect x="0.75" y="0.75" width="38.5" height="38.5" rx="9.25" stroke="url(#nm-badge-border)" strokeWidth="1.2" />

      {/* Letter N (Naan) with Electric Cyan Gradient */}
      <path
        d="M 8.5 27 V 13 L 17 27 V 13"
        stroke="url(#nm-n-gradient)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Letter M (Mudhalvan) in Crisp Pure White */}
      <path
        d="M 22 27 V 13 L 26.25 19.5 L 30.5 13 V 27"
        stroke="#FFFFFF"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Active Sandbox Execution Terminal Indicator */}
      <circle cx="34" cy="26" r="1.5" fill="#38BDF8" />
    </svg>
  );
};

export default NMSandboxLogo;
