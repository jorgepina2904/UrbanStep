import React from 'react';

/**
 * BrandLogo — Logotipo Oficial UrbanStep Venezuela
 * Muestra la identidad corporativa oficial (U5 / UrbanStep Sneakers & Streetwear Store)
 */
export default function BrandLogo({
    variant = 'compact', // 'full', 'compact', 'icon', 'badge'
    size = 'md',        // 'sm', 'md', 'lg', 'xl'
    className = '',
    onClick,
    showSubtitle = true
}) {
    // Icon / Emblem version for collapsed sidebar or small buttons
    if (variant === 'icon') {
        const sizeClasses = {
            sm: 'w-7 h-7',
            md: 'w-9 h-9',
            lg: 'w-11 h-11',
            xl: 'w-14 h-14'
        }[size] || 'w-9 h-9';

        return (
            <div
                onClick={onClick}
                className={`relative overflow-hidden rounded-xl bg-black border border-blue-500/30 shadow-md shadow-blue-500/20 flex items-center justify-center shrink-0 group ${sizeClasses} ${className} ${onClick ? 'cursor-pointer' : ''}`}
                title="UrbanStep Sneakers & Streetwear Store"
            >
                <img
                    src="/brand/urbanstep-emblem.png"
                    alt="UrbanStep Emblem"
                    className="w-full h-full object-contain p-0.5 group-hover:scale-105 transition-transform duration-300"
                />
            </div>
        );
    }

    // Full Banner Logo (e.g. Hero, Landing footer, About, Login modal)
    if (variant === 'full') {
        return (
            <div
                onClick={onClick}
                className={`relative overflow-hidden rounded-2xl bg-black border border-blue-500/30 shadow-xl shadow-blue-600/10 group ${className} ${onClick ? 'cursor-pointer' : ''}`}
            >
                <img
                    src="/brand/urbanstep-logo.png"
                    alt="UrbanStep Sneakers & Streetwear Store"
                    className="w-full h-auto object-contain max-h-56 mx-auto group-hover:brightness-105 transition-all duration-300"
                />
            </div>
        );
    }

    // Badge Logo for Receipts / Tickets / Invoices
    if (variant === 'badge') {
        return (
            <div
                onClick={onClick}
                className={`flex flex-col items-center justify-center text-center ${className}`}
            >
                <div className="w-14 h-14 rounded-2xl overflow-hidden bg-black border border-blue-500/30 p-1 mb-2 shadow-sm">
                    <img
                        src="/brand/urbanstep-emblem.png"
                        alt="UrbanStep"
                        className="w-full h-full object-contain"
                    />
                </div>
                <h2 className="text-sm font-black tracking-tighter uppercase text-gray-900 dark:text-white">
                    URBAN<span className="text-blue-600">STEP</span>
                </h2>
                <p className="text-[9px] font-mono tracking-wider text-gray-500 uppercase">
                    Sneakers & Streetwear Store
                </p>
            </div>
        );
    }

    // Default: 'compact' horizontal layout for Sidebar and Navigation Headers
    const logoSizes = {
        sm: { img: 'w-8 h-8', text: 'text-base', sub: 'text-[9px]' },
        md: { img: 'w-10 h-10', text: 'text-lg', sub: 'text-[10px]' },
        lg: { img: 'w-12 h-12', text: 'text-xl', sub: 'text-[11px]' },
        xl: { img: 'w-14 h-14', text: 'text-2xl', sub: 'text-xs' }
    }[size] || { img: 'w-10 h-10', text: 'text-lg', sub: 'text-[10px]' };

    return (
        <div
            onClick={onClick}
            className={`flex items-center gap-2.5 overflow-hidden select-none ${className} ${onClick ? 'cursor-pointer' : ''}`}
        >
            <div className={`${logoSizes.img} rounded-xl overflow-hidden bg-black border border-blue-500/40 shadow-md shadow-blue-500/20 shrink-0 flex items-center justify-center p-0.5`}>
                <img
                    src="/brand/urbanstep-emblem.png"
                    alt="UrbanStep Logo"
                    className="w-full h-full object-contain"
                />
            </div>
            <div className="min-w-0 flex flex-col justify-center">
                <div className="flex items-center gap-1.5 leading-none">
                    <span className={`font-black tracking-tight uppercase italic bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-400 ${logoSizes.text}`}>
                        URBAN<span className="text-white dark:text-white">STEP</span>
                    </span>
                    <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-blue-600 text-white shadow-sm">
                        STORE
                    </span>
                </div>
                {showSubtitle && (
                    <span className={`font-mono text-gray-400 dark:text-gray-400 tracking-wider uppercase mt-1 truncate ${logoSizes.sub}`}>
                        Sneakers & Streetwear
                    </span>
                )}
            </div>
        </div>
    );
}
