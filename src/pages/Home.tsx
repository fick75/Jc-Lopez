import React, { useState, useEffect } from 'react';
import { AvailabilityCards } from '../components/AvailabilityCards';
import { WeeklyCalendar } from '../components/WeeklyCalendar';
import { BookingModal } from '../components/BookingModal';
import { RecentRequests } from '../components/RecentRequests';
import { Reservation } from '../types';
import { Leaf, Moon, Sun } from 'lucide-react';

export function Home() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  const toggleTheme = () => {
    setIsDarkMode(prev => {
      const newMode = !prev;
      if (newMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return newMode;
    });
  };
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalInitialData, setModalInitialData] = useState<{ space?: string, date?: string }>({});
  
  const fetchReservations = async () => {
    try {
      const res = await fetch('/api/reservations');
      const data = await res.json();
      setReservations(data);
    } catch (error) {
      console.error("Failed to load reservations:", error);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, []);

  const handleRequestSlot = (space: string, date: string) => {
    setModalInitialData({ space, date });
    setIsModalOpen(true);
  };

  const handleOpenNewRequest = () => {
    setModalInitialData({});
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen pb-20">
      <header className="bg-surface border-b border-border sticky top-0 z-40 transition-colors">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-forest rounded-xl flex items-center justify-center text-paper">
              <Leaf className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-medium text-forest leading-tight">Espacios CITRO</h1>
              <p className="text-xs text-forest-light tracking-wide uppercase font-medium">Universidad Veracruzana</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl border border-border text-forest hover:bg-forest/5 transition-colors"
              aria-label="Alternar tema"
              title="Alternar tema"
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button 
              onClick={handleOpenNewRequest}
              className="px-6 py-2.5 rounded-xl bg-forest text-paper font-medium hover:bg-forest-light transition-colors shadow-sm"
            >
              Nueva Solicitud
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-12">
        <AvailabilityCards reservations={reservations} />
        <WeeklyCalendar reservations={reservations} onRequestSlot={handleRequestSlot} />
        <RecentRequests reservations={reservations} />
      </main>

      <BookingModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        initialSpace={modalInitialData.space}
        initialDate={modalInitialData.date}
        onSuccess={() => {
          fetchReservations();
        }}
      />
    </div>
  );
}

