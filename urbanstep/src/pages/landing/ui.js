/**
 * ui.js — Clases compartidas del diseño "Sportswear Elite" de la tienda web.
 * Modo oscuro por variantes `dark:` (ThemeContext alterna la clase `dark` en <html>).
 */
import { useEffect } from 'react';

/** Cierra un modal o drawer con la tecla Escape mientras está abierto. */
export const useEscapeKey = (isOpen, onClose) => {
    useEffect(() => {
        if (!isOpen) return undefined;
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [isOpen, onClose]);
};
export const accentText = 'text-sky-600 dark:text-us-cyan';
export const kicker = 'font-us-mono text-xs uppercase tracking-widest font-bold text-sky-600 dark:text-us-cyan';
export const heading = 'font-us-display font-black uppercase tracking-tight text-slate-900 dark:text-white';
export const bodyText = 'text-slate-600 dark:text-gray-300';
export const mutedText = 'text-slate-500 dark:text-gray-400';
export const strongText = 'text-slate-900 dark:text-white';

export const panel = 'bg-white dark:bg-us-panel border border-slate-200 dark:border-white/10';
export const tile = 'bg-slate-50 dark:bg-us-elevated border border-slate-200 dark:border-white/10';
export const sectionAlt = 'bg-slate-100/70 dark:bg-us-ink border-slate-200 dark:border-white/10';

export const btnPrimary = 'bg-us-cyan text-black font-us-mono font-bold uppercase tracking-wider hover:brightness-110 shadow-lg shadow-cyan-500/25 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed';
export const btnGhost = 'bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-200 dark:bg-us-high dark:hover:bg-us-highest dark:text-white dark:border-white/10 font-us-mono font-bold uppercase tracking-wider transition-all active:scale-95';

export const chip = (active) => `px-3 py-1.5 rounded-lg font-us-mono text-xs font-bold uppercase whitespace-nowrap transition-all ${
    active
        ? 'bg-us-cyan text-black shadow shadow-cyan-500/20'
        : 'bg-white text-slate-600 border border-slate-200 hover:text-slate-900 dark:bg-us-mid dark:text-gray-400 dark:border-white/5 dark:hover:text-white'
}`;

/** Campos de formulario de los modales (fondo blanco en ambos temas, como el diseño). */
export const fieldLabel = 'block font-us-mono text-[11px] font-bold uppercase tracking-wide text-gray-700 mb-1';
export const fieldInput = 'w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600';

/** Desplaza suavemente hasta una sección por id. */
export const scrollToId = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
};
