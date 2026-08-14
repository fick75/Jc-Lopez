export interface Reservation {
  id: number;
  space: string;
  date: string;
  startTime: string;
  endTime: string;
  name: string;
  email: string;
  reason: string;
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED';
  createdAt: string;
}

export const SPACES = [
  { id: 'sum', name: 'Salón de Usos Múltiples' },
  { id: 'posgrado', name: 'Salón Posgrado Orquidario' },
  { id: 'auditorio', name: 'Auditorio Orquidario' }
];
