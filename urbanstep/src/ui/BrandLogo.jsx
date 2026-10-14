import React from 'react';

/**
 * BrandLogo — Logotipo Oficial UrbanStep Venezuela
 * Identidad corporativa oficial (U5 / UrbanStep Sneakers & Streetwear Store)
 * Soporta modo claro y oscuro con máxima legibilidad y sin desbordamientos.
 */
export default function BrandLogo({
    variant = 'compact', // 'full', 'compact', 'icon', 'badge'
    size = 'md',        // 'xs', 'sm', 'md', 'lg', 'xl'
    theme = 'auto',     // 'auto', 'light', 'dark'
    className = '',
    onClick,
    showSubtitle = true
}) {
    // Dynamic color tokens according to theme
    const colors = {
        light: {
            urban: 'text-blue-600',
            step: 'text-slate-950',
            sub: 'text-slate-600',
            box: 'bg-black border-blue-600/40 shadow-blue-500/10'
        },
        dark: {
            urban: 'text-blue-400',
            step: 'text-white',
            sub: 'text-gray-400',
            box: 'bg-black border-blue-500/40 shadow-blue-500/20'
        },
        auto: {
            urban: 'text-blue-600 dark:text-blue-400',
            step: 'text-slate-950 dark:text-white',
            sub: 'text-slate-600 dark:text-gray-400',
            box: 'bg-black border-blue-600/30 dark:border-blue-500/40 shadow-blue-500/10 dark:shadow-blue-500/20'
        }
    }[theme] || {
        urban: 'text-blue-600 dark:text-blue-400',
        step: 'text-slate-950 dark:text-white',
        sub: 'text-slate-600 dark:text-gray-400',
        box: 'bg-black border-blue-600/30 dark:border-blue-500/40'
    };

    // 1. Icon / Emblem version for collapsed sidebar or small buttons
    if (variant === 'icon') {
        const sizeClasses = {
            xs: 'w-6 h-6',
            sm: 'w-7 h-7',
            md: 'w-8 h-8',
            lg: 'w-10 h-10',
            xl: 'w-12 h-12'
        }[size] || 'w-8 h-8';

        return (
            <div
                onClick={onClick}
                className={`relative overflow-hidden rounded-xl ${colors.box} border shadow-md flex items-center justify-center shrink-0 group ${sizeClasses} ${className} ${onClick ? 'cursor-pointer' : ''}`}
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

    // 2. Full Banner Logo (e.g. Hero, Landing footer, About, Login modal)
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

    // 3. Badge Logo for Receipts / Tickets / Invoices / Modal Headers
    if (variant === 'badge') {
        return (
            <div
                onClick={onClick}
                className={`flex flex-col items-center justify-center text-center ${className}`}
            >
                <div className="w-12 h-12 rounded-2xl overflow-hidden bg-black border border-blue-500/30 p-1 mb-2 shadow-sm">
                    <img
                        src="/brand/urbanstep-emblem.png"
                        alt="UrbanStep"
                        className="w-full h-full object-contain"
                    />
                </div>
                <h2 className="text-sm font-black tracking-tighter uppercase leading-tight">
                    <span className={colors.urban}>URBAN</span>
                    <span className={colors.step}>STEP</span>
                </h2>
                <p className={`text-[9px] font-mono tracking-wider uppercase font-semibold ${colors.sub}`}>
                    Sneakers & Streetwear Store
                </p>
            </div>
        );
    }

    // 4. Default: 'compact' horizontal layout for Sidebar and Navigation Headers
    const logoSizes = {
        xs: { img: 'w-7 h-7', text: 'text-sm', sub: 'text-[8.5px]', gap: 'gap-2' },
        sm: { img: 'w-8 h-8', text: 'text-base', sub: 'text-[9px]', gap: 'gap-2' },
        md: { img: 'w-9 h-9', text: 'text-lg', sub: 'text-[10px]', gap: 'gap-2.5' },
        lg: { img: 'w-10 h-10', text: 'text-xl', sub: 'text-[11px]', gap: 'gap-3' },
        xl: { img: 'w-12 h-12', text: 'text-2xl', sub: 'text-xs', gap: 'gap-3.5' }
    }[size] || { img: 'w-9 h-9', text: 'text-lg', sub: 'text-[10px]', gap: 'gap-2.5' };

    return (
        <div
            onClick={onClick}
            className={`flex items-center ${logoSizes.gap} select-none shrink-0 ${className} ${onClick ? 'cursor-pointer' : ''}`}
        >
            {/* Emblem Icon Square */}
            <div className={`${logoSizes.img} rounded-xl overflow-hidden ${colors.box} border shrink-0 flex items-center justify-center p-0.5 shadow-sm`}>
                <img
                    src="/brand/urbanstep-emblem.png"
                    alt="UrbanStep Logo"
                    className="w-full h-full object-contain"
                />
            </div>

            {/* Typography Group */}
            <div className="flex flex-col justify-center min-w-0">
                <div className="flex items-center gap-1.5 leading-none shrink-0">
                    <span className={`font-black tracking-tight uppercase italic whitespace-nowrap ${logoSizes.text}`}>
                        <span className={colors.urban}>URBAN</span>
                        <span className={colors.step}>STEP</span>
                    </span>
                    <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-blue-600 text-white shadow-xs shrink-0 whitespace-nowrap">
                        STORE
                    </span>
                </div>
                {showSubtitle && (
                    <span className={`font-mono tracking-wider uppercase mt-1 font-semibold truncate ${colors.sub} ${logoSizes.sub}`}>
                        Sneakers & Streetwear
                    </span>
                )}
            </div>
        </div>
    );
}
