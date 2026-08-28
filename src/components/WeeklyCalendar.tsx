import React, { useState } from 'react';
import { Reservation, SPACES } from '../types';
import { format, addDays, startOfWeek, addWeeks, subWeeks, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

interface WeeklyCalendarProps {
  reservations: Reservation[];
  onRequestSlot: (space: string, date: string) => void;
}

export function WeeklyCalendar({ reservations, onRequestSlot }: WeeklyCalendarProps) {
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const nextWeek = () => setCurrentWeek(addWeeks(currentWeek, 1));
  const prevWeek = () => setCurrentWeek(subWeeks(currentWeek, 1));
  const goToToday = () => setCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const days = Array.from({ length: 7 }).map((_, i) => addDays(currentWeek, i));

  const getReservationsForSlot = (spaceName: string, dateString: string) => {
    return reservations.filter(r => r.space === spaceName && r.date === dateString && r.status !== 'REJECTED' && r.status !== 'CANCELLED');
  };

  return (
    <div className="bg-surface rounded-3xl shadow-sm border border-border overflow-hidden mb-12">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-6 border-b border-border bg-surface-alt">
        <h2 className="text-2xl text-forest font-medium flex items-center gap-2">
          <CalendarIcon className="w-6 h-6 opacity-80" />
          Agenda Semanal
        </h2>
        
        <div className="flex items-center gap-4">
          <button onClick={goToToday} className="text-sm font-medium text-forest hover:text-forest-light transition-colors px-3 py-1.5 bg-paper rounded-lg border border-border">
            Hoy
          </button>
          <div className="flex items-center bg-paper rounded-lg border border-border overflow-hidden">
            <button onClick={prevWeek} className="p-2 hover:bg-forest/5 text-forest transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="px-4 py-2 font-mono text-sm text-forest border-x border-border">
              {format(days[0], "d MMM", { locale: es })} - {format(days[6], "d MMM, yyyy", { locale: es })}
            </div>
            <button onClick={nextWeek} className="p-2 hover:bg-forest/5 text-forest transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Days Header Row */}
          <div className="grid grid-cols-8 border-b border-border">
            <div className="col-span-1 p-4 bg-surface-alt"></div>
            {days.map((day, i) => {
              const isToday = isSameDay(day, new Date());
              return (
                <div key={i} className={`col-span-1 p-4 text-center border-l border-border ${isToday ? 'bg-orchid/5' : ''}`}>
                  <div className={`text-sm mb-1 ${isToday ? 'text-orchid font-medium' : 'text-forest-light'}`}>
                    {format(day, 'EEEE', { locale: es })}
                  </div>
                  <div className={`text-xl font-mono ${isToday ? 'text-orchid font-semibold' : 'text-forest'}`}>
                    {format(day, 'd')}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Spaces Rows */}
          {SPACES.map((space, spaceIdx) => (
            <div key={space.id} className={`grid grid-cols-8 ${spaceIdx < SPACES.length - 1 ? 'border-b border-border' : ''}`}>
              <div className="col-span-1 p-4 flex items-center bg-surface-alt">
                <span className="text-sm font-medium text-forest leading-tight">{space.name}</span>
              </div>
              
              {days.map((day, i) => {
                const dateString = format(day, 'yyyy-MM-dd');
                const slotReservations = getReservationsForSlot(space.name, dateString);
                
                return (
                  <div 
                    key={i} 
                    className="col-span-1 p-2 border-l border-border min-h-[120px] hover:bg-forest/5 transition-colors cursor-pointer relative group flex flex-col gap-2"
                    onClick={() => onRequestSlot(space.name, dateString)}
                  >
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-forest/5 transition-opacity z-0 pointer-events-none">
                      <span className="text-xs font-medium text-forest bg-surface px-2 py-1 rounded shadow-sm border border-border">+ Solicitar</span>
                    </div>

                    {slotReservations.map(res => (
                      <div 
                        key={res.id} 
                        className={`relative z-10 p-2 rounded-md text-xs border ${
                          res.status === 'CONFIRMED' 
                            ? 'bg-forest/10 border-forest/20 text-forest' 
                            : 'bg-amber-warm/10 border-amber-warm/30 text-amber-warm border-dashed'
                        }`}
                        onClick={(e) => e.stopPropagation()} // Prevent triggering slot request
                        title={`${res.startTime} - ${res.endTime}: ${res.reason}`}
                      >
                        <div className="font-mono mb-1">{res.startTime}-{res.endTime}</div>
                        <div className="font-medium truncate">{res.name}</div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      
      {/* Legend */}
      <div className="p-4 bg-surface-alt border-t border-border flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-forest/10 border border-forest/20 rounded"></div>
          <span className="text-forest">Confirmado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-amber-warm/10 border border-amber-warm/30 rounded border-dashed"></div>
          <span className="text-forest">Pendiente de aprobación</span>
        </div>
      </div>
    </div>
  );
}
