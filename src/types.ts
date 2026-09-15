export interface Reservation {
  id: number;
  space: string;
  date: string;
  startTime: string;
  endTime: string;
  name: string;
  email: string;
  reason: string;
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'CANCELLED';
  createdAt: string;
}

export const SPACES = [
  { id: 'sum', name: 'Salón de Usos Múltiples', capacity: 40 },
  { id: 'posgrado', name: 'Salón Posgrado Orquidario', capacity: 20 },
  { id: 'auditorio', name: 'Auditorio Orquidario', capacity: 80 },
  { id: 'estudiantes', name: 'Sala Estudiantes', capacity: 12 }
];
