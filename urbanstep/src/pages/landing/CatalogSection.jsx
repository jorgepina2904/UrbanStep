import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingBag, Home, Search, X, Package, Bell } from 'lucide-react';
import { productService } from '../../services/productService';
import { getColorHex } from '../../utils/shoeSizes';
import { chip, heading, kicker } from './ui';
import { DEFAULT_SIZES, cardColors, resolveActiveSize } from './catalogUtils';

/** Tarjeta de calzado: color, talla con stock real, lista de deseos, bolsa y prueba en casa. */
export function ProductCard({ product, selectedColor, selectedSize, inCartQty, isWished, renderDualPrice, onSelectColor, onSelectSize, onToggleWish, onAdd, onTryOn }) {
    const colors = cardColors(product);
    const activeColor = selectedColor || colors[0];
    const activeSize = resolveActiveSize(product, activeColor, selectedSize);
    const sizes = product.sizes || DEFAULT_SIZES;
    const sizeStock = Object.fromEntries(sizes.map(sz => [sz, productService.getAvailableStock(product, sz, activeColor)]));
    const available = sizeStock[activeSize] ?? productService.getAvailableStock(product, activeSize, activeColor);
    const isOut = available <= 0;
    const isMax = !isOut && inCartQty >= available;
    const image = productService.getColorVariantImage(product, activeColor) || product.imageUrl || product.image;
    const price = renderDualPrice(product.price);
    const lowStock = product.stock <= (product.minStock || 5);

    return (
        <article className="group bg-white dark:bg-us-carbon border border-slate-200 dark:border-white/10 rounded-2xl p-4 flex flex-col justify-between hover:border-sky-500 dark:hover:border-us-cyan/50 transition-all shadow-lg shadow-slate-200/60 dark:shadow-xl dark:shadow-black/30 min-w-0">
            <div className="min-w-0">
                <div className="flex justify-between items-center gap-2 text-[10px] font-us-mono mb-2">
                    <span className="bg-slate-100 dark:bg-us-mid px-2 py-0.5 rounded text-slate-600 dark:text-gray-400 uppercase font-bold truncate">{product.brand}</span>
                    <span className={`font-bold uppercase shrink-0 ${lowStock ? 'text-orange-500 dark:text-orange-400' : 'text-sky-600 dark:text-us-cyan'}`}>
                        {lowStock ? `⚡ Solo ${product.stock} pares` : `${product.stock} pares en stock`}
                    </span>
                </div>

                <div className="relative w-full aspect-square bg-white ring-1 ring-slate-200 dark:ring-white/10 rounded-xl p-3 flex items-center justify-center overflow-hidden mb-3">
                    <Link to={`/producto/${product.id}`} aria-label={`Ver detalle de ${product.name}`} className="w-full h-full flex items-center justify-center">
                        <img
                            key={`${product.id}-${activeColor}`}
                            src={image}
                            alt={`${product.name} - ${activeColor}`}
                            loading="lazy"
                            className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-300"
                        />
                    </Link>
                    <button
                        type="button"
                        onClick={() => onToggleWish(product)}
                        aria-pressed={isWished}
                        aria-label={isWished ? `Quitar ${product.name} de la lista de deseos` : `Guardar ${product.name} en la lista de deseos`}
                        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 hover:bg-white shadow flex items-center justify-center"
                    >
                        <Heart className={`w-4 h-4 ${isWished ? 'fill-red-500 text-red-500' : 'text-gray-500'}`} />
                    </button>
                </div>

                <h3 className="font-us-display font-black text-sm uppercase text-slate-900 dark:text-white truncate">
                    <Link to={`/producto/${product.id}`} className="hover:text-sky-600 dark:hover:text-us-cyan focus:outline-none focus-visible:underline">{product.name}</Link>
                </h3>
                <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5 truncate">
                    Color: <span className="font-semibold text-slate-700 dark:text-gray-200">{activeColor}</span> • {product.category || 'Sneakers'}
                </p>

                {colors.length > 1 && (
                    <div className="flex items-center gap-1.5 mt-2" aria-label="Colores disponibles">
                        {colors.slice(0, 6).map(c => {
                            const selected = activeColor.toLowerCase() === c.toLowerCase();
                            return (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => onSelectColor(product.id, c)}
                                    title={c}
                                    aria-label={`Color ${c}`}
                                    aria-pressed={selected}
                                    className={`w-5 h-5 rounded-full border transition-transform hover:scale-110 ${selected ? 'ring-2 ring-sky-500 dark:ring-us-cyan ring-offset-1 ring-offset-white dark:ring-offset-us-carbon border-white' : 'border-slate-300 dark:border-white/30'}`}
                                    style={{ background: getColorHex(c) }}
                                />
                            );
                        })}
                        {colors.length > 6 && <span className="text-[10px] font-us-mono text-slate-500">+{colors.length - 6}</span>}
                    </div>
                )}

                <div className="mt-2.5">
                    <div className="flex items-center gap-1.5 flex-wrap font-us-mono text-[11px]">
                        <span className="text-[10px] text-slate-500 dark:text-gray-500 mr-0.5">TALLA:</span>
                        {sizes.map(sz => {
                            const out = sizeStock[sz] <= 0;
                            const selected = String(activeSize) === String(sz);
                            return (
                                <button
                                    key={sz}
                                    type="button"
                                    onClick={() => onSelectSize(product.id, sz)}
                                    aria-pressed={selected}
                                    title={out ? `Talla ${sz} agotada en ${activeColor}` : `${sizeStock[sz]} pares de talla ${sz} en ${activeColor}`}
                                    className={`px-2 py-0.5 rounded font-bold transition-colors ${selected
                                        ? (out ? 'bg-rose-600 text-white' : 'bg-us-cyan text-black')
                                        : out
                                            ? 'bg-slate-100 text-slate-400 line-through dark:bg-us-mid dark:text-gray-600'
                                            : 'bg-slate-100 text-slate-700 hover:text-slate-950 dark:bg-us-mid dark:text-gray-300 dark:hover:text-white'}`}
                                >
                                    {sz}
                                </button>
                            );
                        })}
                    </div>
                    <p className={`mt-1 text-[10px] font-us-mono font-bold ${isOut ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        Talla {activeSize}: {isOut ? 'agotada' : `${available} disponible${available === 1 ? '' : 's'}`}
                    </p>
                </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-white/10">
                <div className="flex justify-between items-baseline gap-2 mb-3">
                    <div className="min-w-0">
                        <span className="font-us-display font-black text-lg text-slate-900 dark:text-white block leading-tight">{price.primary}</span>
                        <span className="font-us-mono text-[11px] text-slate-500 dark:text-gray-400 block">{price.secondary}</span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 dark:bg-cyan-950 dark:text-us-cyan font-us-mono text-[10px] font-bold uppercase truncate max-w-[45%]">
                        {product.category || 'Original'}
                    </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    {isOut ? (
                        <Link
                            to={`/producto/${product.id}`}
                            className="w-full py-2 bg-slate-200 text-slate-700 dark:bg-us-high dark:text-gray-200 font-us-mono text-xs font-bold uppercase rounded-lg flex items-center justify-center gap-1"
                            title="Te avisamos cuando llegue tu talla"
                        >
                            <Bell className="w-4 h-4" /> Avísame
                        </Link>
                    ) : (
                        <button
                            type="button"
                            disabled={isMax}
                            onClick={() => onAdd(product, activeColor, activeSize)}
                            className="w-full py-2 bg-us-cyan text-black font-us-mono text-xs font-bold uppercase rounded-lg hover:brightness-110 flex items-center justify-center gap-1 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ShoppingBag className="w-4 h-4" />
                            {isMax ? 'Máx.' : inCartQty > 0 ? `Bolsa (${inCartQty})` : 'Bolsa'}
                        </button>
                    )}
                    <button
                        type="button"
                        disabled={isOut}
                        onClick={() => onTryOn(product, activeColor, activeSize)}
                        title="Delivery Lara: llevamos tu talla + 1 talla de respaldo para que te pruebes antes de pagar"
                        className="w-full py-2 bg-slate-900 text-white hover:bg-slate-800 dark:bg-us-high dark:hover:bg-us-highest font-us-mono text-xs font-bold uppercase rounded-lg flex items-center justify-center gap-1 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <Home className="w-4 h-4" /> Probar
                    </button>
                </div>
            </div>
        </article>
    );
}

/** Sección de catálogo: categorías, marcas, búsqueda, orden y la grilla de calzados. */
export default function CatalogSection({
    totalCount, products, categories, selectedCategory, onCategory, brands, selectedBrand, onBrand,
    searchQuery, onSearch, sortBy, onSort, onReset, renderCard
}) {
    const filtersActive = selectedCategory !== 'TODAS' || selectedBrand !== 'TODAS' || searchQuery.trim() !== '';

    return (
        <section id="catalogo" className="scroll-mt-32 py-14 max-w-7xl mx-auto px-4 w-full">
            <div className="space-y-4 mb-6">
                <div>
                    <p className={kicker}>Inventario tienda Las Trinitarias</p>
                    <h2 className={`${heading} text-2xl sm:text-3xl`}>Calzado disponible hoy</h2>
                </div>
                <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por categoría">
                    {categories.map(c => (
                        <button key={c.id} type="button" onClick={() => onCategory(c.id)} aria-pressed={selectedCategory === c.id} className={chip(selectedCategory === c.id)}>
                            {c.label} ({c.count})
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-center gap-3 mb-8">
                <div className="relative md:w-72 shrink-0">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <label htmlFor="catalog-search" className="sr-only">Buscar en el catálogo</label>
                    <input
                        id="catalog-search"
                        type="search"
                        value={searchQuery}
                        onChange={(e) => onSearch(e.target.value)}
                        placeholder="Buscar: Dunk, Jordan 1, Samba…"
                        className="w-full pl-9 pr-8 py-2 rounded-lg text-xs bg-white dark:bg-us-low border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:border-sky-500 dark:focus:border-us-cyan"
                    />
                    {searchQuery && (
                        <button type="button" onClick={() => onSearch('')} aria-label="Limpiar búsqueda" className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-white">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
                <div className="flex flex-wrap items-center gap-1.5 flex-1" role="group" aria-label="Filtrar por marca">
                    {brands.map(b => (
                        <button key={b} type="button" onClick={() => onBrand(b)} aria-pressed={selectedBrand === b} className={chip(selectedBrand === b)}>
                            {b === 'TODAS' ? 'Todas las marcas' : b}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    <p className="text-xs font-us-mono text-slate-500 dark:text-gray-400"><strong className="text-slate-900 dark:text-white">{products.length}</strong> pares</p>
                    <label className="sr-only" htmlFor="catalog-sort">Ordenar catálogo</label>
                    <select
                        id="catalog-sort"
                        value={sortBy}
                        onChange={(e) => onSort(e.target.value)}
                        className="text-xs font-us-mono font-bold rounded-lg px-3 py-2 border outline-none bg-white border-slate-200 text-slate-700 dark:bg-us-low dark:border-white/10 dark:text-gray-200"
                    >
                        <option value="relevancia">Relevancia</option>
                        <option value="novedades">Novedades</option>
                        <option value="precio-asc">Precio: menor a mayor</option>
                        <option value="precio-desc">Precio: mayor a menor</option>
                        <option value="nombre">Nombre A-Z</option>
                    </select>
                </div>
            </div>

            {products.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {products.map(renderCard)}
                </div>
            ) : (
                <div className="text-center py-16 px-6 space-y-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-us-carbon">
                    <Package className="w-12 h-12 mx-auto text-sky-500/60 dark:text-us-cyan/50" />
                    <p className="font-us-display text-lg font-black uppercase text-slate-900 dark:text-white">
                        {totalCount === 0 ? 'Catálogo en preparación' : 'No encontramos sneakers con ese filtro'}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-gray-400 max-w-md mx-auto">
                        {totalCount === 0
                            ? 'Actualmente no hay calzados registrados con inventario en la tienda. Agrega tus modelos desde el panel administrativo para verlos aquí.'
                            : 'Prueba con otra marca o categoría, o limpia los términos de búsqueda.'}
                    </p>
                    {totalCount > 0 && filtersActive && (
                        <button type="button" onClick={onReset} className="text-xs font-us-mono font-bold uppercase text-sky-600 dark:text-us-cyan hover:underline">
                            Ver todo el catálogo
                        </button>
                    )}
                </div>
            )}
        </section>
    );
}
