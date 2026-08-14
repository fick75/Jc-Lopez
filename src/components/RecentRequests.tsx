import React from 'react';
import { Reservation } from '../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';

interface RecentRequestsProps {
  reservations: Reservation[];
}

export function RecentRequests({ reservations }: RecentRequestsProps) {
  // Sort by creation date descending, take top 8
  const recent = [...reservations].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 8);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return { icon: <CheckCircle2 className="w-4 h-4 text-forest" />, text: 'Aprobada', bg: 'bg-forest/10 text-forest' };
      case 'REJECTED': return { icon: <XCircle className="w-4 h-4 text-red-600" />, text: 'Rechazada', bg: 'bg-red-50 text-red-700' };
      default: return { icon: <Clock className="w-4 h-4 text-amber-warm" />, text: 'Pendiente', bg: 'bg-amber-warm/10 text-amber-warm' };
    }
  };

  return (
    <div className="bg-surface rounded-3xl shadow-sm border border-border overflow-hidden">
      <div className="p-6 border-b border-border bg-surface-alt">
        <h2 className="text-xl text-forest font-medium">Solicitudes Recientes</h2>
      </div>
      
      <div className="divide-y divide-border">
        {recent.length === 0 ? (
          <div className="p-8 text-center text-forest-light">No hay solicitudes recientes.</div>
        ) : (
          recent.map(res => {
            const statusConfig = getStatusConfig(res.status);
            
            return (
              <div key={res.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-surface-alt transition-colors">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-medium text-forest">{res.space}</span>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 ${statusConfig.bg}`}>
                      {statusConfig.icon}
                      {statusConfig.text}
                    </span>
                  </div>
                  <div className="text-sm text-forest-light">
                    {format(new Date(res.date), "EEEE d 'de' MMMM, yyyy", { locale: es })} • <span className="font-mono">{res.startTime} - {res.endTime}</span>
                  </div>
                  <div className="text-sm text-forest-light mt-1">
                    Solicitado por: <span className="font-medium">{res.name}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
