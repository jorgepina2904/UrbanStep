/**
 * Usuarios del sistema UrbanStep - Solo Admin y Cajero
 * Cada cajero tiene credenciales individuales asociadas a una caja específica
 */
export const mockUsers = [
    { id: 'u1', name: 'Administrador General', email: 'admin@urbanstep.com', password: 'admin2914', role: 'Admin', branch: 'Sede Principal', active: true },
    { id: 'u2', name: 'Carlos Pérez', email: 'cajero1@urbanstep.com', password: 'cajero123', role: 'Cajero', branch: 'Sede Principal', assignedCaja: 'Caja 1', active: true },
    { id: 'u3', name: 'María González', email: 'cajero2@urbanstep.com', password: 'cajero123', role: 'Cajero', branch: 'Sede Principal', assignedCaja: 'Caja 2', active: true },
    { id: 'u4', name: 'José Rodríguez', email: 'cajero3@urbanstep.com', password: 'cajero123', role: 'Cajero', branch: 'Sede Principal', assignedCaja: 'Caja 3', active: true },
    { id: 'u-mot1', name: 'Carlos Mendoza', email: 'motorizado1@urbanstep.com', password: 'moto123', role: 'Motorizado', branch: 'Sede Barquisimeto', phone: '0412-5551234', vehicle: 'Bera SBR 150 Azul', plate: 'AB1C23D', rating: 4.9, deliveriesCount: 142, active: true },
    { id: 'u-mot2', name: 'Pedro Yépez', email: 'motorizado2@urbanstep.com', password: 'moto123', role: 'Motorizado', branch: 'Sede Barquisimeto', phone: '0414-9876543', vehicle: 'Keeway Horse 150 Rojo', plate: 'XY9Z87W', rating: 4.8, deliveriesCount: 98, active: true },
    { id: 'u-mot3', name: 'Roberto Gómez', email: 'motorizado3@urbanstep.com', password: 'moto123', role: 'Motorizado', branch: 'Sede Barquisimeto', phone: '0416-5554321', vehicle: 'Suzuki AX4 115 Negro', plate: 'JK4M56N', rating: 5.0, deliveriesCount: 215, active: true },
    { id: 'u-mot4', name: 'Juan Alvarado', email: 'motorizado4@urbanstep.com', password: 'moto123', role: 'Motorizado', branch: 'Sede Barquisimeto', phone: '0424-7778899', vehicle: 'Bera Merú 150 Blanco', plate: 'CD5E67F', rating: 4.9, deliveriesCount: 76, active: true },
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