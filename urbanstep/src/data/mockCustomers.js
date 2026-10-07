import { generateId } from '../utils/generateId';

const venezuelanFirstNames = ['Carlos', 'Valentina', 'Alejandro', 'Gabriela', 'Jesús', 'Daniela', 'Luis', 'Mariana', 'José', 'Andrea', 'Diego', 'Camila', 'Manuel', 'Sofía', 'Andrés'];
const venezuelanLastNames = ['Mendoza', 'Rodríguez', 'Gómez', 'Hernández', 'Pérez', 'Castillo', 'Torres', 'Morales', 'Ramírez', 'Flores', 'García', 'Silva', 'Rojas', 'Blanco'];
const venezuelanStates = [
    { state: 'Distrito Capital', city: 'Caracas (Chacao)' },
    { state: 'Distrito Capital', city: 'Caracas (Baruta)' },
    { state: 'Miranda', city: 'Los Teques' },
    { state: 'Miranda', city: 'San Antonio de los Altos' },
    { state: 'Carabobo', city: 'Valencia' },
    { state: 'Zulia', city: 'Maracaibo' },
    { state: 'Lara', city: 'Barquisimeto' },
    { state: 'Aragua', city: 'Maracay' },
    { state: 'Anzoátegui', city: 'Lechería' }
];

const phonePrefixes = ['0412', '0414', '0424', '0416'];

export const mockCustomers = Array.from({ length: 25 }).map((_, index) => {
    const firstName = venezuelanFirstNames[index % venezuelanFirstNames.length];
    const lastName = venezuelanLastNames[(index * 3) % venezuelanLastNames.length];
    const location = venezuelanStates[index % venezuelanStates.length];
    const prefix = phonePrefixes[index % phonePrefixes.length];
    const docNum = (14000000 + (index * 734912)) % 32000000;
    
    return {
        id: generateId('CLT'),
        docType: index % 6 === 0 ? 'J' : 'V',
        docNumber: `${index % 6 === 0 ? 'J' : 'V'}-${docNum}`,
        firstName,
        lastName,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index + 1}@gmail.com`,
        phone: `${prefix}-${1000000 + Math.floor(Math.random() * 8999999)}`,
        state: location.state,
        city: location.city,
        address: `Av. Principal, Edif. Los Samanes, Apto ${index + 1}B`,
        totalSpent: Math.floor(Math.random() * 800) + 50,
        purchasesCount: Math.floor(Math.random() * 10) + 1,
        registeredAt: new Date(Date.now() - Math.floor(Math.random() * 10000000000)).toISOString()
    };
});

// Cliente público general por defecto (Venta de mostrador)
mockCustomers.unshift({
    id: 'publico',
    docType: 'V',
    docNumber: '00000000',
    firstName: 'Venta al',
    lastName: 'Público General',
    email: '-',
    phone: '-',
    state: 'Distrito Capital',
    city: 'Caracas',
    address: 'Mostrador Tienda',
    totalSpent: 0,
    purchasesCount: 0
});

export default mockCustomers;