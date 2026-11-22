import React from 'react';

export type BrandLogoVariant = 'sm' | 'md' | 'lg' | 'icon';

interface BrandLogoProps {
  variant?: BrandLogoVariant;
  showText?: boolean;
  subtitle?: string;
  className?: string;
}

const SIZE_MAP: Record<BrandLogoVariant, { box: string; text: string }> = {
  icon: { box: 'h-9 w-9', text: 'text-base' },
  sm: { box: 'h-9 w-9', text: 'text-lg' },
  md: { box: 'h-10 w-10', text: 'text-xl' },
  lg: { box: 'h-14 w-14', text: 'text-2xl' },
};

export function BrandLogo({
  variant = 'md',
  showText = true,
  subtitle,
  className = '',
}: BrandLogoProps) {
  const sizes = SIZE_MAP[variant];
  const shouldShowText = variant !== 'icon' && showText;

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <div className={`relative aspect-square shrink-0 flex items-center justify-center ${sizes.box}`}>
        <img
          src="/brand/logo-flowagenda-mark.png"
          alt="Logo FlowAgenda — Agenda Inteligente"
          className="h-full w-full object-contain drop-shadow-[0_0_8px_rgba(136,192,208,0.28)]"
        />
      </div>

      {shouldShowText && (
        <div className="flex flex-col justify-center">
          <span className={`font-semibold tracking-tight text-[#ECEFF4] leading-none ${sizes.text}`}>
            FlowAgenda
          </span>
          {subtitle && (
            <span className="mt-1 text-[10px] font-medium uppercase tracking-wider text-[#88C0D0]">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
