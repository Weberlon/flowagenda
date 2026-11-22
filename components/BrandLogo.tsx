import React from 'react';

export type BrandLogoVariant = 'sm' | 'md' | 'lg' | 'icon';

interface BrandLogoProps {
  variant?: BrandLogoVariant;
  showText?: boolean;
  subtitle?: string;
  className?: string;
}

const SIZE_MAP: Record<BrandLogoVariant, { box: string; text: string }> = {
  icon: { box: 'h-9 w-9 rounded-xl', text: 'text-base' },
  sm: { box: 'h-9 w-9 rounded-xl', text: 'text-base' },
  md: { box: 'h-10 w-10 rounded-xl', text: 'text-xl' },
  lg: { box: 'h-14 w-14 rounded-2xl', text: 'text-2xl' },
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
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <div
        className={`relative aspect-square shrink-0 overflow-hidden border border-[#4C566A]/70 bg-[#2E3440] shadow-md ${sizes.box}`}
      >
        <img
          src="/brand/logo-flowagenda.png"
          alt="Logo FlowAgenda — Agenda Inteligente"
          className="h-full w-full object-contain"
        />
      </div>

      {shouldShowText && (
        <div className="flex flex-col">
          <span className={`font-black tracking-tight text-[#ECEFF4] leading-none ${sizes.text}`}>
            FlowAgenda
          </span>
          {subtitle && (
            <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-[#88C0D0]">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
