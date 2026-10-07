export const mockSuppliers = [
    {
        id: 'PRV-101',
        rif: 'J-31245678-9',
        name: 'Distribuidora Deportiva Ávila C.A.',
        contactPerson: 'Roberto Benítez',
        phone: '+58 212-976-5432',
        email: 'ventas@distavila.com.ve',
        city: 'Caracas',
        address: 'Zona Industrial La Trinidad, Galpón 4',
        brands: ['Nike', 'Jordan'],
        paymentTerms: 'Crédito 15 días'
    },
    {
        id: 'PRV-102',
        rif: 'J-40192837-1',
        name: 'Importadora Andina de Calzado C.A.',
        contactPerson: 'Mariana Duarte',
        phone: '+58 241-823-1100',
        email: 'compras@andinacalzados.com.ve',
        city: 'Valencia',
        address: 'Urb. Industrial Castillito, Calle 102',
        brands: ['Adidas', 'Puma'],
        paymentTerms: 'Contado'
    },
    {
        id: 'PRV-103',
        rif: 'J-29837465-4',
        name: 'Representaciones Urbanas del Caribe C.A.',
        contactPerson: 'Gustavo Paolini',
        phone: '+58 251-254-8899',
        email: 'contacto@urbanocaribe.com.ve',
        city: 'Barquisimeto',
        address: 'Av. Las Industrias, Edif. Caribe Piso 1',
        brands: ['Vans', 'Converse'],
        paymentTerms: 'Crédito 30 días'
    },
    {
        id: 'PRV-104',
        rif: 'J-30495867-2',
        name: 'Calzados & Confort San Antonio C.A.',
        contactPerson: 'Elena Villasmil',
        phone: '+58 261-789-4455',
        email: 'pedidos@sanantoniocalzado.com',
        city: 'Maracaibo',
        address: 'Calle 72 con Av. 15 Delicias',
        brands: ['New Balance', 'Skechers', 'UrbanStep'],
        paymentTerms: 'Contado'
    }
];

export const mockPurchases = [
    {
        id: 'CMP-1001',
        invoiceNumber: 'FAC-2026-9042',
        controlNumber: '00-008921',
        supplierId: 'PRV-101',
        supplierName: 'Distribuidora Deportiva Ávila C.A.',
        supplierRif: 'J-31245678-9',
        date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'recibida',
        paymentMethod: 'transferencia',
        paymentBank: '0134 - Banesco',
        bcvRate: 42.50,
        subtotalUsd: 1850.00,
        taxUsd: 296.00, // 16% IVA
        totalUsd: 2146.00,
        subtotalBs: 78625.00,
        taxBs: 12580.00,
        totalBs: 91205.00,
        itemsCount: 45,
        items: [
            { productId: 'PRD-1000', name: 'Nike Sneaker Pro #1', brand: 'Nike', quantity: 20, unitCostUsd: 45.00, totalUsd: 900.00 },
            { productId: 'PRD-1004', name: 'Vans Sneaker Pro #5', brand: 'Vans', quantity: 15, unitCostUsd: 38.00, totalUsd: 570.00 },
            { productId: 'PRD-1008', name: 'Nike Sneaker Pro #9', brand: 'Nike', quantity: 10, unitCostUsd: 38.00, totalUsd: 380.00 }
        ],
        receivedBy: 'Almacén Central',
        notes: 'Lote de calzado deportivo recibido en perfecto estado con empaque original.'
    },
    {
        id: 'CMP-1002',
        invoiceNumber: 'FAC-2026-3819',
        controlNumber: '00-003418',
        supplierId: 'PRV-102',
        supplierName: 'Importadora Andina de Calzado C.A.',
        supplierRif: 'J-40192837-1',
        date: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'recibida',
        paymentMethod: 'zelle',
        paymentBank: 'Zelle Divisas',
        bcvRate: 43.10,
        subtotalUsd: 2420.00,
        taxUsd: 387.20,
        totalUsd: 2807.20,
        subtotalBs: 104302.00,
        taxBs: 16688.32,
        totalBs: 120990.32,
        itemsCount: 52,
        items: [
            { productId: 'PRD-1001', name: 'Adidas Sneaker Pro #2', brand: 'Adidas', quantity: 25, unitCostUsd: 50.00, totalUsd: 1250.00 },
            { productId: 'PRD-1002', name: 'Puma Sneaker Pro #3', brand: 'Puma', quantity: 27, unitCostUsd: 43.33, totalUsd: 1170.00 }
        ],
        receivedBy: 'Almacén Central',
        notes: 'Reposición de modelos de alta rotación para sucursales.'
    },
    {
        id: 'CMP-1003',
        invoiceNumber: 'FAC-2026-1184',
        controlNumber: '00-001092',
        supplierId: 'PRV-103',
        supplierName: 'Representaciones Urbanas del Caribe C.A.',
        supplierRif: 'J-29837465-4',
        date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'recibida',
        paymentMethod: 'transferencia',
        paymentBank: '0102 - Banco de Venezuela',
        bcvRate: 43.80,
        subtotalUsd: 1340.00,
        taxUsd: 214.40,
        totalUsd: 1554.40,
        subtotalBs: 58692.00,
        taxBs: 9390.72,
        totalBs: 68082.72,
        itemsCount: 30,
        items: [
            { productId: 'PRD-1003', name: 'UrbanStep Urban Hoodie #4', brand: 'UrbanStep', quantity: 15, unitCostUsd: 40.00, totalUsd: 600.00 },
            { productId: 'PRD-1005', name: 'New Balance Sneaker Pro #6', brand: 'New Balance', quantity: 15, unitCostUsd: 49.33, totalUsd: 740.00 }
        ],
        receivedBy: 'Almacén Central',
        notes: 'Entrada parcial de mercancía de nueva colección streetwear.'
    },
    {
        id: 'CMP-1004',
        invoiceNumber: 'FAC-2026-6701',
        controlNumber: '00-006201',
        supplierId: 'PRV-104',
        supplierName: 'Calzados & Confort San Antonio C.A.',
        supplierRif: 'J-30495867-2',
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'pendiente',
        paymentMethod: 'efectivo_usd',
        paymentBank: 'Efectivo Divisas',
        bcvRate: 44.20,
        subtotalUsd: 950.00,
        taxUsd: 152.00,
        totalUsd: 1102.00,
        subtotalBs: 41990.00,
        taxBs: 6718.40,
        totalBs: 48708.40,
        itemsCount: 22,
        items: [
            { productId: 'PRD-1006', name: 'Nike Cap Classic #7', brand: 'Nike', quantity: 12, unitCostUsd: 25.00, totalUsd: 300.00 },
            { productId: 'PRD-1007', name: 'Adidas Sneaker Pro #8', brand: 'Adidas', quantity: 10, unitCostUsd: 65.00, totalUsd: 650.00 }
        ],
        receivedBy: 'En Tránsito',
        notes: 'Orden de compra confirmada, en traslado desde Maracaibo.'
    }
];

export default mockPurchases;
