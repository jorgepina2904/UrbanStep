/**
 * loyalty.js — UrbanStep VIP Club. 1 punto por cada USD comprado (neto de Notas de Crédito).
 * El saldo se calcula siempre desde el historial de ventas, por lo que no hay nada que sincronizar.
 */
export const VIP_TIERS = [
    { id: 'rookie', name: 'Rookie', minPoints: 0, discountPct: 0, freeShipping: false, perk: 'Acumula puntos desde tu primera compra' },
    { id: 'fan', name: 'Streetwear Fan', minPoints: 300, discountPct: 3, freeShipping: false, perk: '3% de descuento en todas tus compras web' },
    { id: 'vip', name: 'Sneakerhead VIP', minPoints: 1000, discountPct: 5, freeShipping: true, perk: '5% de descuento y envío gratis en cada pedido' }
];

export const tierForPoints = (points) => [...VIP_TIERS].reverse().find(t => points >= t.minPoints) || VIP_TIERS[0];

/** @returns {{points:number, tier:object, next:object|null, toNext:number, progressPct:number}} */
export const computeLoyalty = ({ sales = [], creditNotes = [] }) => {
    const earned = sales.filter(s => s.status !== 'anulada_por_nc').reduce((a, s) => a + (Number(s.total) || 0), 0);
    const returned = creditNotes.reduce((a, n) => a + (Number(n.totalUsd) || 0), 0);
    const points = Math.max(0, Math.floor(earned - returned));
    const tier = tierForPoints(points);
    const next = VIP_TIERS.find(t => t.minPoints > points) || null;
    const span = next ? next.minPoints - tier.minPoints : 1;
    return {
        points, tier, next,
        toNext: next ? next.minPoints - points : 0,
        progressPct: next ? Math.min(100, Math.round(((points - tier.minPoints) / span) * 100)) : 100
    };
};

/** Promoción automática equivalente al beneficio del nivel (para el motor de promociones del checkout). */
export const tierPromotions = (tier) => {
    const promos = [];
    if (tier.discountPct > 0) promos.push({ id: `vip-${tier.id}-disc`, tipo: 'porcentaje', valor: tier.discountPct, automatico: true, activo: true, descripcion: `Club VIP ${tier.name}: -${tier.discountPct}%` });
    if (tier.freeShipping) promos.push({ id: `vip-${tier.id}-ship`, tipo: 'envio_gratis', valor: 0, automatico: true, activo: true, descripcion: `Club VIP ${tier.name}: envío gratis` });
    return promos;
};
