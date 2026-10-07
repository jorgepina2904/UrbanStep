/**
 * Usuarios del sistema UrbanStep - Solo Admin y Cajero
 * Cada cajero tiene credenciales individuales asociadas a una caja específica
 */
export const mockUsers = [
    { id: 'u1', name: 'Administrador General', email: 'admin@urbanstep.com', password: 'admin123', role: 'Admin', branch: 'Sede Principal', active: true },
    { id: 'u2', name: 'Carlos Pérez', email: 'cajero1@urbanstep.com', password: 'cajero123', role: 'Cajero', branch: 'Sede Principal', assignedCaja: 'Caja 1', active: true },
    { id: 'u3', name: 'María González', email: 'cajero2@urbanstep.com', password: 'cajero123', role: 'Cajero', branch: 'Sede Principal', assignedCaja: 'Caja 2', active: true },
    { id: 'u4', name: 'José Rodríguez', email: 'cajero3@urbanstep.com', password: 'cajero123', role: 'Cajero', branch: 'Sede Principal', assignedCaja: 'Caja 3', active: true },
];

/**
 * Cajas registradoras disponibles en el sistema
 * Cada caja requiere credenciales para ser aperturada
 */
export const cashRegisters = [
    { id: 'caja-1', name: 'Caja 1', location: 'Planta Baja - Entrada Principal', pin: '1234', active: true },
    { id: 'caja-2', name: 'Caja 2', location: 'Planta Baja - Lateral Derecho', pin: '5678', active: true },
    { id: 'caja-3', name: 'Caja 3', location: 'Piso 1 - Área Premium', pin: '9012', active: true },
    { id: 'caja-4', name: 'Caja 4', location: 'Piso 1 - Sección Deportiva', pin: '3456', active: false },
];