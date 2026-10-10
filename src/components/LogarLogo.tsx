import React, { useState, useEffect } from 'react';
import { HotelBrandingConfig, LogoShape } from '../types';
import { getHotelBranding, normalizeBranding } from '../services/systemSettingsService';
import { Edit2, Sparkles, Building2, Shield, Leaf } from 'lucide-react';

interface LogarLogoProps {
  className?: string;
  variant?: 'full' | 'icon' | 'badge' | 'header';
  light?: boolean;
  branding?: HotelBrandingConfig;
  onEdit?: () => void;
  showEditButton?: boolean;
}

/**
 * Official Lombok Garden Hotel 5-Petal Flower Emblem
 * Vectorized from official Lombok Garden branding emblem (40.png)
 */
export const HotelFlowerIcon: React.FC<{ className?: string; color?: string; centerColor?: string }> = ({
  className = 'w-6 h-6',
  color = '#FFFFFF',
  centerColor = '#22C55E',
}) => {
  return (
    <svg
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Lombok Garden Hotel Flower Logo"
    >
      <path 
        d="M256 30C230 120 130 110 90 170C50 230 100 290 150 300C120 320 80 350 90 410C100 470 170 470 215 420C240 470 290 500 350 470C410 440 420 370 390 320C460 330 510 270 480 210C450 150 370 180 330 210C360 140 310 60 256 30Z" 
        fill={color === '#FFFFFF' ? '#22C55E' : color} 
        stroke="#14532D" 
        strokeWidth="16" 
        strokeLinejoin="round" 
      />
      <path d="M230 180 C240 220 210 260 170 280" fill="none" stroke="#14532D" strokeWidth="22" strokeLinecap="round" />
      <path d="M280 200 C270 230 310 270 350 280" fill="none" stroke="#14532D" strokeWidth="22" strokeLinecap="round" />
      <path d="M220 280 C250 270 270 310 260 360" fill="none" stroke="#14532D" strokeWidth="22" strokeLinecap="round" />
      <circle cx="256" cy="265" r="42" fill={centerColor} stroke="#14532D" strokeWidth="20" />
    </svg>
  );
};

export function getShapeClass(shape: LogoShape = 'rounded'): string {
  switch (shape) {
    case 'circle':
      return 'rounded-full';
    case 'square':
      return 'rounded-md';
    case 'rounded':
    default:
      return 'rounded-2xl';
  }
}

export const LogarLogo: React.FC<LogarLogoProps> = ({
  className = 'h-9 w-auto',
  variant = 'full',
  light = true,
  branding: propBranding,
  onEdit,
  showEditButton = false,
}) => {
  const [activeBranding, setActiveBranding] = useState<HotelBrandingConfig>(() => {
    return normalizeBranding(propBranding || getHotelBranding());
  });
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (propBranding) {
      setActiveBranding(normalizeBranding(propBranding));
      setImageError(false);
      return;
    }

    const handleSettingsUpdate = (e: any) => {
      if (e.detail?.branding) {
        setActiveBranding(normalizeBranding(e.detail.branding));
        setImageError(false);
      }
    };

    window.addEventListener('logar_settings_updated', handleSettingsUpdate);
    return () => {
      window.removeEventListener('logar_settings_updated', handleSettingsUpdate);
    };
  }, [propBranding]);

  const textColor = light ? '#FFFFFF' : '#231E1B';
  const bgColor = activeBranding.bgColor || '#95A823';
  const shapeClass = getShapeClass(activeBranding.logoShape);
  const brandTitle = activeBranding.brandTitle || 'LOMBOK GARDEN HOTEL';
  const brandSubtitle = activeBranding.brandSubtitle || 'MOD REPORT LOGAR';
  const badgeText = activeBranding.badgeText || 'MOD';
  const hasCustomImage = Boolean(activeBranding.logoUrl && !imageError);

  // Render Inner Icon/Image content
  const renderIconContent = () => {
    if (hasCustomImage && activeBranding.logoUrl) {
      return (
        <img
          src={activeBranding.logoUrl}
          alt={brandTitle}
          className="w-full h-full object-contain filter drop-shadow-xs"
          onError={() => setImageError(true)}
        />
      );
    }

    if (activeBranding.customIconType === 'building') {
      return <Building2 className="w-full h-full text-white p-1" />;
    }
    if (activeBranding.customIconType === 'shield') {
      return <Shield className="w-full h-full text-white p-1" />;
    }
    if (activeBranding.customIconType === 'leaf') {
      return <Leaf className="w-full h-full text-white p-1" />;
    }

    return <HotelFlowerIcon className="w-full h-full" color="#FFFFFF" centerColor="#EAEEBB" />;
  };

  if (variant === 'icon') {
    return (
      <div className="relative group inline-block">
        <div
          className={`relative flex items-center justify-center p-1.5 shadow-md transition-all duration-300 ${shapeClass} ${className}`}
          style={{ backgroundColor: bgColor }}
        >
          {renderIconContent()}
        </div>

        {showEditButton && onEdit && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#231E1B] text-[#EAEEBB] hover:bg-[#95A823] hover:text-white border border-[#EAEEBB]/50 flex items-center justify-center shadow-lg transition-transform hover:scale-110 opacity-0 group-hover:opacity-100 z-10"
            title="Ganti Logo & Ikon"
            aria-label="Ganti Logo"
          >
            <Edit2 className="w-2.5 h-2.5" />
          </button>
        )}
      </div>
    );
  }

  if (variant === 'badge') {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-[#231E1B] border border-[#3D352F] text-white shadow-md relative group ${className}`}>
        <div
          className={`w-6 h-6 flex items-center justify-center p-0.5 shrink-0 ${shapeClass}`}
          style={{ backgroundColor: bgColor }}
        >
          {renderIconContent()}
        </div>
        <div className="leading-tight">
          <span className="font-extrabold text-xs tracking-wider uppercase">{brandTitle}</span>
          <span className="block text-[9px] text-[#C6CC81] font-bold">{brandSubtitle}</span>
        </div>

        {showEditButton && onEdit && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="w-4 h-4 rounded-full bg-[#3D352F] hover:bg-[#95A823] text-[#EAEEBB] hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ml-1"
            title="Ganti Logo"
          >
            <Edit2 className="w-2.5 h-2.5" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2.5 relative group ${className}`}>
      {/* Emblem Icon / Custom Logo Container */}
      <div className="relative">
        <div
          className={`w-10 h-10 flex items-center justify-center p-1.5 shadow-md transition-all duration-300 shrink-0 border border-white/20 ${shapeClass}`}
          style={{ backgroundColor: bgColor }}
        >
          {renderIconContent()}
        </div>

        {showEditButton && onEdit && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#231E1B] text-[#EAEEBB] hover:bg-[#95A823] hover:text-white border border-[#EAEEBB]/60 flex items-center justify-center shadow-lg transition-transform hover:scale-110 opacity-0 group-hover:opacity-100 z-10"
            title="Ganti Logo & Ikon Hotel"
            aria-label="Ganti Logo"
          >
            <Edit2 className="w-2.5 h-2.5" />
          </button>
        )}
      </div>

      {/* Typography */}
      <div className="leading-tight">
        <div className="flex items-center gap-1.5">
          <span 
            className="font-extrabold text-base tracking-wider uppercase font-sans truncate max-w-[180px] sm:max-w-[240px]"
            style={{ color: textColor }}
          >
            {brandTitle}
          </span>
        </div>
        <p className="text-[10px] tracking-widest uppercase font-semibold text-[#C6CC81] truncate max-w-[200px] sm:max-w-[260px]">
          {brandSubtitle}
        </p>
      </div>
    </div>
  );
};
