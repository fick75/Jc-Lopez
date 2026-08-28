import React from 'react';
import { Reservation, SPACES } from '../types';
import { Leaf, Users, Presentation, Clock, CheckCircle2 } from 'lucide-react';
import { isWithinInterval, parse, format } from 'date-fns';

interface AvailabilityCardsProps {
  reservations: Reservation[];
}

export function AvailabilityCards({ reservations }: AvailabilityCardsProps) {
  const now = new Date();
  const currentDateString = format(now, 'yyyy-MM-dd');
  const currentTimeString = format(now, 'HH:mm');

  const getSpaceStatus = (spaceName: string) => {
    const activeReservation = reservations.find(r => 
      r.space === spaceName && 
      r.status === 'CONFIRMED' &&
      r.date === currentDateString &&
      r.startTime <= currentTimeString &&
      r.endTime >= currentTimeString
    );

    return activeReservation;
  };

  const getIcon = (spaceId: string) => {
    switch (spaceId) {
      case 'sum': return <Users className="w-8 h-8 opacity-80" />;
      case 'posgrado': return <Leaf className="w-8 h-8 opacity-80" />;
      case 'auditorio': return <Presentation className="w-8 h-8 opacity-80" />;
      default: return <CheckCircle2 className="w-8 h-8 opacity-80" />;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
      {SPACES.map(space => {
        const activeRes = getSpaceStatus(space.name);
        
        return (
          <div key={space.id} className="bg-surface p-6 rounded-2xl shadow-sm border border-border flex flex-col justify-between">
            <div className="flex items-start justify-between mb-4">
              <div className="text-forest">
                {getIcon(space.id)}
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-mono font-medium ${activeRes ? 'bg-amber-warm/10 text-amber-warm' : 'bg-forest/10 text-forest'}`}>
                {activeRes ? 'OCUPADO' : 'LIBRE AHORA'}
              </div>
            </div>
            
            <div>
              <h3 className="text-xl font-medium text-forest mb-1">{space.name}</h3>
              <p className="text-xs text-forest-light/70 mb-1">Capacidad: {space.capacity} personas</p>
              {activeRes ? (
                <p className="text-sm text-forest-light flex items-center gap-1.5 font-mono mt-3">
                  <Clock className="w-4 h-4" />
                  Ocupado hasta las {activeRes.endTime}
                </p>
              ) : (
                <p className="text-sm text-forest-light/70 mt-3">Disponible para reserva inmediata</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
