import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ShoppingBag, Heart, Ruler, ChevronLeft, ChevronRight, Star, Flame, Truck, ShieldCheck, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { productService } from '../services/productService';
import { wishlistService, reviewService, accountService } from '../services/storefrontService';
import { stockAlertService } from '../services/marketingService';
import { getColorHex } from '../utils/shoeSizes';
import { getSizeRows, recommendSize } from '../utils/sizeGuide';
import BrandLogo from '../ui/BrandLogo';
import Modal from '../ui/Modal';

const Stars = ({ value, size = 'w-4 h-4' }) => (
    <span className="inline-flex" role="img" aria-label={`${value} de 5 estrellas`}>
        {[1, 2, 3, 4, 5].map(n => (
            <Star key={n} className={`${size} ${n <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'text-gray-300 dark:text-gray-600'}`} />
        ))}
    </span>
);

/** Galería: foto del color elegido primero, luego las demás variantes y la foto principal. */
const buildGallery = (product, color) => {
    if (!product) return [];
    const list = [];
    const add = (url) => { if (url && !list.includes(url)) list.push(url); };
    add(productService.getColorVariantImage(product, color));
    (product.colorVariants || []).forEach(v => { add(v.imageUrl); add(v.image); });
    (Array.isArray(product.images) ? product.images : []).forEach(add);
    add(product.imageUrl);
    add(product.image);
    return list;
};

export default function ProductDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { items: cartItems, addItem, itemCount } = useCart();
    const { formatUSD, formatBs, toBs } = useCurrency();

    const [product, setProduct] = useState(null);
    const [related, setRelated] = useState([]);
    const [loading, setLoading] = useState(true);
    const [color, setColor] = useState(null);
    const [size, setSize] = useState(null);
    const [imgIndex, setImgIndex] = useState(0);
    const [zoom, setZoom] = useState(null);
    const [guideOpen, setGuideOpen] = useState(false);
    const [footCm, setFootCm] = useState('');
    const [wished, setWished] = useState(false);
    const [reviews, setReviews] = useState([]);
    const [reviewForm, setReviewForm] = useState({ rating: 0, title: '', comment: '' });
    const [sendingReview, setSendingReview] = useState(false);
    const [alertSize, setAlertSize] = useState(null);
    const [alertForm, setAlertForm] = useState({ name: '', contact: '' });
    const [sendingAlert, setSendingAlert] = useState(false);

    useEffect(() => {
        let alive = true;
        (async () => {
            setLoading(true);
            try {
                const all = await productService.getAll();
                const found = all.find(p => String(p.id) === String(id));
                if (!alive) return;
                setProduct(found || null);
                if (found) {
                    const colors = Array.isArray(found.colors) && found.colors.length > 0 ? found.colors : (found.color ? [found.color] : []);
                    setColor(colors[0] || null);
                    setSize(null);
                    setImgIndex(0);
                    setRelated(all.filter(p => p.id !== found.id && !p.disabled && p.stock > 0 && (p.brand === found.brand || p.category === found.category)).slice(0, 4));
                    setWished(wishlistService.has(user, found.id));
                    setReviews(await reviewService.list(found.id));
                }
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => { alive = false; };
    }, [id, user]);

    const colors = useMemo(() => (product && Array.isArray(product.colors) && product.colors.length > 0 ? product.colors : (product?.color ? [product.color] : [])), [product]);
    const gallery = useMemo(() => buildGallery(product, color), [product, color]);
    const sizeStock = useMemo(() => (product ? productService.getColorSizeStock(product, color) : {}), [product, color]);
    const sizes = useMemo(() => (product?.sizes?.length ? product.sizes.map(String) : Object.keys(sizeStock)), [product, sizeStock]);
    const available = useCallback((s) => (product ? productService.getAvailableStock(product, s, color) : 0), [product, color]);
    const sizeRows = useMemo(() => getSizeRows(sizes, product?.sizeCategory || 'unisex'), [sizes, product]);
    const summary = useMemo(() => reviewService.summarize(reviews), [reviews]);

    useEffect(() => { setImgIndex(0); setAlertSize(null); }, [color]);

    const submitAlert = async (e) => {
        e.preventDefault();
        setSendingAlert(true);
        try {
            const res = await stockAlertService.subscribe({ product, color, size: alertSize, name: alertForm.name || user?.name, contact: alertForm.contact });
            toast.success(res.duplicated ? 'Ya estabas en la lista: te avisaremos' : `¡Listo! Te avisamos cuando llegue la talla ${alertSize}`);
            setAlertSize(null);
            setAlertForm({ name: '', contact: '' });
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSendingAlert(false);
        }
    };

    const selectedStock = size ? available(size) : 0;
    const totalAvailable = useMemo(() => sizes.reduce((acc, s) => acc + available(s), 0), [sizes, available]);

    const handleAdd = () => {
        if (!size) { toast.error('Elige tu talla primero'); return; }
        if (selectedStock <= 0) { toast.error('Esa talla está agotada'); return; }
        const inCart = cartItems.find(i => (i.productId === product.id || i.id === product.id) && String(i.size) === String(size) && String(i.color || '').toLowerCase() === String(color || '').toLowerCase());
        if ((inCart?.quantity || 0) >= selectedStock) {
            toast.error(`Ya tienes el máximo disponible (${selectedStock} par${selectedStock > 1 ? 'es' : ''}) en tu bolsa`);
            return;
        }
        const image = gallery[0] || product.imageUrl;
        addItem({ ...product, imageUrl: image, image }, size, 1, color);
        toast.success(`Agregado: ${product.name} (${color || 'Único'} · Talla ${size})`, { icon: '🛍️' });
    };

    const toggleWish = () => {
        const now = wishlistService.toggle(user, product.id);
        setWished(now);
        toast.success(now ? 'Guardado en tu lista de deseos' : 'Quitado de tu lista de deseos');
    };

    const submitReview = async (e) => {
        e.preventDefault();
        setSendingReview(true);
        try {
            const verified = await accountService.hasPurchased(user, product.id);
            const res = await reviewService.add({
                productId: product.id, userId: user.id, userName: user.name,
                rating: reviewForm.rating, title: reviewForm.title, comment: reviewForm.comment, verifiedPurchase: verified
            });
            toast.success(res.moderated ? 'Gracias. Tu reseña se publicará tras la revisión.' : '¡Gracias por tu reseña!');
            setReviewForm({ rating: 0, title: '', comment: '' });
            setReviews(await reviewService.list(product.id));
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSendingReview(false);
        }
    };

    const onZoomMove = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setZoom({ x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 });
    };

    if (loading) {
        return <div role="status" className="min-h-screen flex items-center justify-center text-sm text-gray-500">Cargando modelo…</div>;
    }
    if (!product) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
                <p className="text-lg font-bold text-gray-900 dark:text-white">No encontramos este modelo</p>
                <Link to="/landing" className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold">Volver al catálogo</Link>
            </div>
        );
    }

    const lowForSelected = size && selectedStock > 0 && selectedStock <= 3;
    const lowOverall = !size && totalAvailable > 0 && totalAvailable <= 5;
    const mainImage = gallery[imgIndex] || gallery[0];

    return (
        <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
            <header className="sticky top-0 z-30 flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-gray-950/90 backdrop-blur">
                <button type="button" onClick={() => navigate('/landing')} className="inline-flex items-center gap-1 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-blue-600">
                    <ChevronLeft className="w-4 h-4" /> Catálogo
                </button>
                <Link to="/landing" aria-label="UrbanStep"><BrandLogo variant="badge" /></Link>
                <div className="flex items-center gap-2">
                    <Link to="/cuenta" aria-label="Mi cuenta" className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"><User className="w-5 h-5" /></Link>
                    <Link to="/landing?cart=1" aria-label={`Mi bolsa, ${itemCount} artículos`} className="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800">
                        <ShoppingBag className="w-5 h-5" />
                        {itemCount > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">{itemCount}</span>}
                    </Link>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Galería */}
                <section aria-label="Fotos del producto" className="space-y-3">
                    <div
                        className="relative aspect-square rounded-3xl bg-gray-100 dark:bg-gray-900 overflow-hidden cursor-zoom-in"
                        onMouseMove={onZoomMove}
                        onMouseLeave={() => setZoom(null)}
                    >
                        {mainImage && (
                            <img
                                src={mainImage}
                                alt={`${product.name} - ${color || ''} vista ${imgIndex + 1}`}
                                className="w-full h-full object-contain p-4 transition-transform duration-150"
                                style={zoom ? { transform: 'scale(2)', transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
                            />
                        )}
                        {gallery.length > 1 && (
                            <>
                                <button type="button" aria-label="Foto anterior" onClick={() => setImgIndex((imgIndex - 1 + gallery.length) % gallery.length)} className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 dark:bg-gray-800/80 shadow"><ChevronLeft className="w-4 h-4" /></button>
                                <button type="button" aria-label="Foto siguiente" onClick={() => setImgIndex((imgIndex + 1) % gallery.length)} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 dark:bg-gray-800/80 shadow"><ChevronRight className="w-4 h-4" /></button>
                            </>
                        )}
                        <button type="button" onClick={toggleWish} aria-pressed={wished} aria-label={wished ? 'Quitar de la lista de deseos' : 'Agregar a la lista de deseos'} className="absolute top-3 right-3 p-2.5 rounded-full bg-white/90 dark:bg-gray-800/90 shadow">
                            <Heart className={`w-5 h-5 ${wished ? 'fill-red-500 text-red-500' : ''}`} />
                        </button>
                    </div>
                    {gallery.length > 1 && (
                        <div className="flex gap-2 overflow-x-auto no-scrollbar">
                            {gallery.map((url, i) => (
                                <button key={url} type="button" onClick={() => setImgIndex(i)} aria-label={`Ver foto ${i + 1}`} aria-current={i === imgIndex}
                                    className={`shrink-0 w-16 h-16 rounded-xl bg-gray-100 dark:bg-gray-900 overflow-hidden border-2 ${i === imgIndex ? 'border-blue-600' : 'border-transparent'}`}>
                                    <img src={url} alt="" className="w-full h-full object-contain" />
                                </button>
                            ))}
                        </div>
                    )}
                </section>

                {/* Información */}
                <section className="space-y-5">
                    <div>
                        <p className="text-xs font-bold tracking-widest text-blue-600">{(product.brand || 'URBANSTEP').toUpperCase()}</p>
                        <h1 className="text-3xl font-black mt-1">{product.name}</h1>
                        <div className="flex items-center gap-2 mt-2 text-sm">
                            {summary.count > 0 ? (<><Stars value={summary.average} /><span className="font-semibold">{summary.average}</span><span className="text-gray-500">({summary.count} reseña{summary.count > 1 ? 's' : ''})</span></>)
                                : <span className="text-gray-500">Aún sin reseñas</span>}
                        </div>
                    </div>

                    <div>
                        <p className="text-3xl font-black">{formatUSD(product.price)}</p>
                        <p className="text-sm font-semibold text-emerald-600">{formatBs(toBs(product.price))}</p>
                    </div>

                    {product.description && <p className="text-sm text-gray-600 dark:text-gray-400">{product.description}</p>}

                    {colors.length > 0 && (
                        <fieldset>
                            <legend className="text-sm font-semibold mb-2">Color: <span className="font-normal text-gray-500">{color}</span></legend>
                            <div className="flex flex-wrap gap-2">
                                {colors.map(c => (
                                    <button key={c} type="button" onClick={() => { setColor(c); setSize(null); }} aria-label={`Color ${c}`} aria-pressed={c === color}
                                        className={`w-9 h-9 rounded-full border-2 ${c === color ? 'border-blue-600 ring-2 ring-blue-300' : 'border-gray-300 dark:border-gray-600'}`}
                                        style={{ backgroundColor: getColorHex(c) }} />
                                ))}
                            </div>
                        </fieldset>
                    )}

                    <fieldset>
                        <div className="flex items-center justify-between mb-2">
                            <legend className="text-sm font-semibold">Talla (EU)</legend>
                            <button type="button" onClick={() => setGuideOpen(true)} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline">
                                <Ruler className="w-3.5 h-3.5" /> Guía de tallas
                            </button>
                        </div>
                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                            {sizes.map(s => {
                                const left = available(s);
                                const out = left <= 0;
                                return (
                                    <button key={s} type="button" onClick={() => { if (out) { setAlertSize(s); setSize(null); } else { setSize(s); setAlertSize(null); } }} aria-pressed={size === s}
                                        aria-label={out ? `Talla ${s}, agotada: avísame cuando llegue` : `Talla ${s}`}
                                        className={`py-2.5 rounded-xl border text-sm font-bold ${size === s ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 dark:border-gray-700'} ${out ? `opacity-50 line-through ${alertSize === s ? 'ring-2 ring-amber-400' : ''}` : 'hover:border-blue-500'}`}>
                                        {s}
                                    </button>
                                );
                            })}
                        </div>
                        <p role="status" className="min-h-[1.5rem] mt-2 text-sm font-semibold">
                            {lowForSelected && <span className="inline-flex items-center gap-1 text-red-600"><Flame className="w-4 h-4" /> Solo quedan {selectedStock} par{selectedStock > 1 ? 'es' : ''} en talla {size}</span>}
                            {!lowForSelected && lowOverall && <span className="inline-flex items-center gap-1 text-amber-600"><Flame className="w-4 h-4" /> Últimas unidades de este modelo</span>}
                        </p>
                    </fieldset>

                    {alertSize && (
                        <form onSubmit={submitAlert} className="p-4 rounded-2xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 space-y-2">
                            <p className="text-sm font-bold text-amber-800 dark:text-amber-300">La talla {alertSize} está agotada. ¿Te avisamos cuando llegue?</p>
                            <input aria-label="Tu nombre" value={alertForm.name} onChange={(e) => setAlertForm({ ...alertForm, name: e.target.value })} placeholder="Tu nombre"
                                className="w-full rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-900 px-3 py-2 text-sm" />
                            <input aria-label="WhatsApp o correo" required value={alertForm.contact} onChange={(e) => setAlertForm({ ...alertForm, contact: e.target.value })} placeholder="WhatsApp (0414-1234567) o correo"
                                className="w-full rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-900 px-3 py-2 text-sm" />
                            <button type="submit" disabled={sendingAlert} className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-sm font-bold disabled:opacity-60">Avisarme cuando esté disponible</button>
                        </form>
                    )}

                    <button type="button" onClick={handleAdd} className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center justify-center gap-2">
                        <ShoppingBag className="w-5 h-5" /> Agregar a la bolsa
                    </button>
                    {itemCount > 0 && (
                        <Link to="/landing?cart=1" className="block text-center text-sm font-semibold text-blue-600 hover:underline">Ver mi bolsa y pagar ({itemCount})</Link>
                    )}

                    <ul className="grid grid-cols-2 gap-3 text-xs text-gray-600 dark:text-gray-400">
                        <li className="flex items-center gap-2"><Truck className="w-4 h-4 text-blue-600" /> Delivery en Barquisimeto y envíos nacionales</li>
                        <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-blue-600" /> Cambios por talla en 7 días con su caja</li>
                    </ul>
                </section>

                {/* Reseñas */}
                <section className="lg:col-span-2 space-y-6" aria-labelledby="reviews-title">
                    <h2 id="reviews-title" className="text-xl font-black">Reseñas de clientes</h2>
                    <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6">
                        <div className="space-y-2">
                            <p className="text-4xl font-black">{summary.count > 0 ? summary.average : '—'}</p>
                            {summary.count > 0 && <Stars value={summary.average} />}
                            <div className="space-y-1 pt-2">
                                {summary.distribution.map(d => (
                                    <div key={d.stars} className="flex items-center gap-2 text-xs">
                                        <span className="w-6">{d.stars}★</span>
                                        <div className="flex-1 h-2 rounded bg-gray-200 dark:bg-gray-800 overflow-hidden"><div className="h-full bg-amber-400" style={{ width: `${summary.count ? (d.count / summary.count) * 100 : 0}%` }} /></div>
                                        <span className="w-5 text-right text-gray-500">{d.count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-4">
                            {reviews.length === 0 && <p className="text-sm text-gray-500">Sé el primero en opinar sobre este modelo.</p>}
                            {reviews.map(r => (
                                <article key={r.id} className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <Stars value={r.calificacion} />
                                        <span className="text-sm font-bold">{r.titulo}</span>
                                    </div>
                                    <p className="text-sm mt-1 text-gray-700 dark:text-gray-300">{r.comentario}</p>
                                    <p className="text-xs text-gray-500 mt-2">
                                        {r.nombre_usuario} · {new Date(r.creado_el).toLocaleDateString('es-VE')}
                                        {r.compra_verificada && <span className="ml-2 text-emerald-600 font-semibold">✓ Compra verificada</span>}
                                    </p>
                                </article>
                            ))}

                            {user ? (
                                <form onSubmit={submitReview} className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-3">
                                    <p className="text-sm font-bold">Escribe tu reseña</p>
                                    <div role="radiogroup" aria-label="Calificación" className="flex gap-1">
                                        {[1, 2, 3, 4, 5].map(n => (
                                            <button key={n} type="button" role="radio" aria-checked={reviewForm.rating === n} aria-label={`${n} estrellas`} onClick={() => setReviewForm({ ...reviewForm, rating: n })}>
                                                <Star className={`w-7 h-7 ${n <= reviewForm.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300 dark:text-gray-600'}`} />
                                            </button>
                                        ))}
                                    </div>
                                    <input aria-label="Título de la reseña" value={reviewForm.title} onChange={(e) => setReviewForm({ ...reviewForm, title: e.target.value })} placeholder="Título (opcional)" maxLength={120}
                                        className="w-full rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-900 px-3 py-2 text-sm" />
                                    <textarea aria-label="Tu opinión" value={reviewForm.comment} onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })} rows={3} placeholder="¿Cómo te quedó? ¿Corre grande o pequeño?"
                                        className="w-full rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-900 px-3 py-2 text-sm" />
                                    <button type="submit" disabled={sendingReview} className="px-5 py-2.5 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-bold disabled:opacity-60">Publicar reseña</button>
                                </form>
                            ) : (
                                <p className="text-sm text-gray-500"><Link to="/landing?login=true" className="text-blue-600 font-semibold">Inicia sesión</Link> para escribir una reseña.</p>
                            )}
                        </div>
                    </div>
                </section>

                {related.length > 0 && (
                    <section className="lg:col-span-2 space-y-4" aria-labelledby="related-title">
                        <h2 id="related-title" className="text-xl font-black">También te puede gustar</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {related.map(p => (
                                <Link key={p.id} to={`/producto/${p.id}`} className="group rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                                    <div className="aspect-square bg-gray-100 dark:bg-gray-900"><img src={p.imageUrl || p.image} alt={p.name} className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform" /></div>
                                    <div className="p-3"><p className="text-xs text-gray-500">{p.brand}</p><p className="text-sm font-bold truncate">{p.name}</p><p className="text-sm">{formatUSD(p.price)}</p></div>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}
            </main>

            <Modal isOpen={guideOpen} onClose={() => setGuideOpen(false)} title="📏 Guía de tallas" size="md">
                <div className="space-y-4">
                    <div>
                        <label htmlFor="foot-cm" className="block text-sm font-medium mb-1.5">Largo de tu pie (cm)</label>
                        <div className="flex gap-2 items-center">
                            <input id="foot-cm" type="number" min="15" max="35" step="0.1" value={footCm} onChange={(e) => setFootCm(e.target.value)} placeholder="26.5"
                                className="w-32 rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-900 px-3 py-2 text-sm" />
                            {footCm && recommendSize(footCm, sizeRows) && (
                                <p role="status" className="text-sm font-bold text-blue-600">Te recomendamos la talla {recommendSize(footCm, sizeRows)}</p>
                            )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Apoya el talón en la pared y mide hasta el dedo más largo. Si estás entre dos tallas, elige la mayor.</p>
                    </div>
                    {sizeRows.length > 0 ? (
                        <table className="w-full text-sm text-center">
                            <thead><tr className="bg-gray-100 dark:bg-gray-800"><th className="py-2">EU</th><th>US</th><th>CM</th></tr></thead>
                            <tbody>
                                {sizeRows.map(r => (
                                    <tr key={r.eu} className={`border-b border-gray-100 dark:border-gray-800 ${size === r.eu ? 'bg-blue-50 dark:bg-blue-950/40 font-bold' : ''}`}>
                                        <td className="py-1.5">{r.eu}</td><td>{r.us}</td><td>{r.cm.toFixed(1)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : <p className="text-sm text-gray-500">Este modelo usa tallas propias; consulta la talla en la etiqueta.</p>}
                    <p className="text-[11px] text-gray-400">Equivalencias referenciales; pueden variar ±0.5 según la marca.</p>
                </div>
            </Modal>
        </div>
    );
}
