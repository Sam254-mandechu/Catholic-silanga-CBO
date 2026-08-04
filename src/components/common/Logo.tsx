interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

const sizes = {
  sm: { container: 'h-8', text: 'text-lg' },
  md: { container: 'h-10', text: 'text-xl' },
  lg: { container: 'h-14', text: 'text-2xl' },
};

export const Logo: React.FC<LogoProps> = ({ size = 'md', showText = true }) => {
  const { container, text } = sizes[size];

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <div className={`relative ${container} aspect-square flex items-center justify-center`}>
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="Catholic Silanga CBO logo"
        >
          {/* Outer circle - represents community */}
          <circle cx="50" cy="50" r="48" fill="#841c1b" />
          <circle cx="50" cy="50" r="44" fill="none" stroke="#f7efe0" strokeWidth="2" />

          {/* Cross - represents Catholic faith */}
          <g transform="translate(50, 50)">
            <rect x="-4" y="-18" width="8" height="36" fill="#f7efe0" />
            <rect x="-14" y="-4" width="28" height="8" fill="#f7efe0" />
          </g>

          {/* Dove - represents peace */}
          <g transform="translate(50, 75)">
            <circle cx="0" cy="0" r="6" fill="#ffffff" />
            <path
              d="M -12,0 Q -6,-3 0,0 Q 6,-3 12,0"
              stroke="#ffffff"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />
          </g>

          {/* Silanga text around circle */}
          <path
            id="circlePath"
            d="M 50,50 m -38,0 a 38,38 0 1,1 76,0 a 38,38 0 1,1 -76,0"
            fill="none"
          />
          <text fill="#ffffff" fontSize="7" fontWeight="bold" letterSpacing="2">
            <textPath href="#circlePath" startOffset="0%">
              CATHOLIC SILANGA CBO
            </textPath>
          </text>
        </svg>
      </div>
      {showText && (
        <div className={`leading-tight ${text}`}>
          <span className="font-heading font-bold text-primary block">Catholic Silanga</span>
          <span className="text-primary font-medium text-xs sm:text-sm block">Community Based Org</span>
        </div>
      )}
    </div>
  );
};
