import React, { useState } from 'react';
import { SPACES } from '../types';
import { X, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSpace?: string;
  initialDate?: string;
  onSuccess: () => void;
}

export function BookingModal({ isOpen, onClose, initialSpace, initialDate, onSuccess }: BookingModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Ocurrió un error');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-forest/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-paper rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-border flex items-center justify-between bg-surface">
          <h2 className="text-2xl text-forest font-medium">Solicitar Espacio</h2>
          <button onClick={onClose} className="p-2 text-forest-light hover:text-forest transition-colors rounded-full hover:bg-forest/5">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 text-sm">
              {error}
            </div>
          )}

          <form id="booking-form" onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-forest mb-1">Espacio</label>
              <select name="space" defaultValue={initialSpace} required className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-forest focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest transition-all">
                <option value="">Selecciona un espacio</option>
                {SPACES.map(s => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-forest mb-1">Fecha</label>
              <input type="date" name="date" defaultValue={initialDate || format(new Date(), 'yyyy-MM-dd')} required className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-forest font-mono focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest transition-all" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-forest mb-1">Hora Inicio</label>
                <input type="time" name="startTime" required className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-forest font-mono focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-forest mb-1">Hora Fin</label>
                <input type="time" name="endTime" required className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-forest font-mono focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest transition-all" />
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <label className="block text-sm font-medium text-forest mb-1">Nombre del Solicitante</label>
              <input type="text" name="name" required placeholder="Ej. Dra. María Pérez" className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-forest focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest transition-all" />
            </div>

            <div>
              <label className="block text-sm font-medium text-forest mb-1">Correo Institucional</label>
              <input type="email" name="email" required placeholder="correo@uv.mx" className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-forest focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest transition-all" />
            </div>

            <div>
              <label className="block text-sm font-medium text-forest mb-1">Motivo / Actividad</label>
              <textarea name="reason" required rows={3} placeholder="Descripción breve de la actividad" className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-forest focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest transition-all resize-none"></textarea>
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-border bg-surface flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={loading} className="px-6 py-2.5 rounded-xl text-forest hover:bg-forest/5 font-medium transition-colors">
            Cancelar
          </button>
          <button type="submit" form="booking-form" disabled={loading} className="px-6 py-2.5 rounded-xl bg-forest hover:bg-forest-light text-white font-medium transition-colors flex items-center gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Enviar Solicitud
          </button>
        </div>
      </div>
    </div>
  );
}
