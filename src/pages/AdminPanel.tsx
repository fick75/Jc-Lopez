import React, { useState, useEffect } from 'react';
import { Reservation } from '../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CheckCircle2, XCircle, Clock, ArrowLeft, Loader2, UserPlus, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface AdminUser {
  id: number;
  name: string;
  email: string;
}

export function AdminPanel() {
  const [password, setPassword] = useState(() => sessionStorage.getItem('citro_admin_pwd') || '');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);

  // New admin form state
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [addAdminLoading, setAddAdminLoading] = useState(false);

  const login = async (pwd: string) => {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pwd }),
    });
    if (!res.ok) throw new Error('Contraseña incorrecta');
    sessionStorage.setItem('citro_admin_pwd', pwd);
    setIsAuthenticated(true);
  };

  // Restore session on page reload without re-prompting for the password
  useEffect(() => {
    const stored = sessionStorage.getItem('citro_admin_pwd');
    if (stored) {
      login(stored).then(fetchData).catch(() => {
        sessionStorage.removeItem('citro_admin_pwd');
        setPassword('');
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoginError('');

    try {
      await login(password);
      fetchData();
    } catch (err: any) {
      setLoginError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('citro_admin_pwd');
    setIsAuthenticated(false);
    setPassword('');
  };

  const fetchData = async () => {
    try {
      const [resData, adminsData] = await Promise.all([
        fetch('/api/reservations').then(r => r.json()),
        fetch('/api/admin/admins', { headers: { 'x-admin-password': password } }).then(r => r.json())
      ]);
      setReservations(resData);
      setAdmins(adminsData);
    } catch (error) {
      console.error("Error fetching admin data:", error);
    }
  };

  const handleUpdateStatus = async (id: number, status: 'CONFIRMED' | 'REJECTED' | 'CANCELLED') => {
    try {
      const res = await fetch(`/api/admin/reservations/${id}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password
        },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(`Error: ${data.error}`);
        return;
      }

      fetchData(); // Refresh
    } catch (error) {
      alert("Error al actualizar la solicitud");
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddAdminLoading(true);
    try {
      const res = await fetch('/api/admin/admins', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-password': password
        },
        body: JSON.stringify({ name: newAdminName, email: newAdminEmail }),
      });
      if (res.ok) {
        setNewAdminName('');
        setNewAdminEmail('');
        fetchData();
      }
    } catch (error) {
      alert("Error al añadir administrador");
    } finally {
      setAddAdminLoading(false);
    }
  };

  const handleDeleteAdmin = async (id: number) => {
    if (!confirm('¿Seguro que deseas eliminar este administrador?')) return;
    try {
      await fetch(`/api/admin/admins/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-password': password }
      });
      fetchData();
    } catch (error) {
      alert("Error al eliminar administrador");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center p-4">
        <div className="bg-surface p-8 rounded-2xl shadow-sm border border-border w-full max-w-md">
          <Link to="/" className="inline-flex items-center text-sm font-medium text-forest-light hover:text-forest mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver al inicio
          </Link>
          <h2 className="text-2xl text-forest font-medium mb-6">Acceso Administrador</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-forest mb-1">Contraseña</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface-alt text-forest focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest transition-all"
                required
              />
            </div>
            {loginError && <p className="text-red-600 text-sm">{loginError}</p>}
            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-forest text-paper font-medium hover:bg-forest-light transition-colors flex justify-center items-center"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return { icon: <CheckCircle2 className="w-4 h-4 text-forest" />, text: 'Aprobada', bg: 'bg-forest/10 text-forest' };
      case 'REJECTED': return { icon: <XCircle className="w-4 h-4 text-red-600" />, text: 'Rechazada', bg: 'bg-red-50 text-red-700' };
      case 'CANCELLED': return { icon: <XCircle className="w-4 h-4 text-forest-light" />, text: 'Cancelada', bg: 'bg-forest/5 text-forest-light' };
      default: return { icon: <Clock className="w-4 h-4 text-amber-warm" />, text: 'Pendiente', bg: 'bg-amber-warm/10 text-amber-warm' };
    }
  };

  return (
    <div className="min-h-screen pb-20 bg-paper">
      <header className="bg-surface border-b border-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="p-2 -ml-2 rounded-xl border border-border text-forest hover:bg-forest/5 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-medium text-forest leading-tight">Panel de Administración</h1>
              <p className="text-xs text-forest-light tracking-wide uppercase font-medium">CITRO</p>
            </div>
          </div>
          <button onClick={handleLogout} className="text-sm font-medium text-forest-light hover:text-forest">
            Cerrar Sesión
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-12 space-y-12">
        {/* Admins Management */}
        <section className="bg-surface rounded-3xl shadow-sm border border-border overflow-hidden">
          <div className="p-6 border-b border-border bg-surface-alt flex justify-between items-center">
            <h2 className="text-xl text-forest font-medium">Administradores</h2>
          </div>
          <div className="p-6">
            <form onSubmit={handleAddAdmin} className="flex gap-4 mb-6 items-end">
              <div className="flex-1">
                <label className="block text-xs font-medium text-forest mb-1">Nombre</label>
                <input type="text" required value={newAdminName} onChange={e => setNewAdminName(e.target.value)} className="w-full px-4 py-2 rounded-xl border border-border bg-surface-alt text-forest focus:outline-none focus:border-forest" />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-forest mb-1">Correo</label>
                <input type="email" required value={newAdminEmail} onChange={e => setNewAdminEmail(e.target.value)} className="w-full px-4 py-2 rounded-xl border border-border bg-surface-alt text-forest focus:outline-none focus:border-forest" />
              </div>
              <button disabled={addAdminLoading} type="submit" className="px-6 py-2 rounded-xl bg-forest text-paper font-medium hover:bg-forest-light flex items-center gap-2 h-[42px]">
                {addAdminLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />} Añadir
              </button>
            </form>

            <div className="space-y-3">
              {admins.map(admin => (
                <div key={admin.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-surface-alt">
                  <div>
                    <div className="font-medium text-forest">{admin.name}</div>
                    <div className="text-sm text-forest-light">{admin.email}</div>
                  </div>
                  <button onClick={() => handleDeleteAdmin(admin.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Reservations Management */}
        <section className="bg-surface rounded-3xl shadow-sm border border-border overflow-hidden">
          <div className="p-6 border-b border-border bg-surface-alt">
            <h2 className="text-xl text-forest font-medium">Gestión de Reservas</h2>
          </div>
          <div className="divide-y divide-border">
            {reservations.length === 0 ? (
              <div className="p-8 text-center text-forest-light">No hay reservas registradas.</div>
            ) : (
              reservations.map(res => {
                const statusConfig = getStatusConfig(res.status);
                
                return (
                  <div key={res.id} className="p-6 flex flex-col md:flex-row md:items-start justify-between gap-6 hover:bg-surface-alt transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-medium text-lg text-forest">{res.space}</span>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 ${statusConfig.bg}`}>
                          {statusConfig.icon}
                          {statusConfig.text}
                        </span>
                      </div>
                      <div className="text-forest-light mb-3">
                        {format(new Date(res.date), "EEEE d 'de' MMMM, yyyy", { locale: es })} • <span className="font-mono font-medium">{res.startTime} - {res.endTime}</span>
                      </div>
                      <div className="text-sm text-forest bg-paper p-3 rounded-xl border border-border mb-3">
                        <strong>Motivo:</strong> {res.reason}
                      </div>
                      <div className="text-sm text-forest-light">
                        Solicitante: <span className="font-medium">{res.name}</span> ({res.email})
                      </div>
                    </div>

                    {res.status === 'PENDING' && (
                      <div className="flex items-center gap-3 self-start md:self-center">
                        <button
                          onClick={() => handleUpdateStatus(res.id, 'REJECTED')}
                          className="px-4 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 font-medium transition-colors"
                        >
                          Rechazar
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(res.id, 'CONFIRMED')}
                          className="px-4 py-2 rounded-lg bg-forest text-paper hover:bg-forest-light font-medium transition-colors"
                        >
                          Aprobar
                        </button>
                      </div>
                    )}

                    {res.status === 'CONFIRMED' && (
                      <div className="flex items-center gap-3 self-start md:self-center">
                        <button
                          onClick={() => {
                            if (confirm('¿Cancelar esta reserva ya confirmada? Se notificará al solicitante.')) {
                              handleUpdateStatus(res.id, 'CANCELLED');
                            }
                          }}
                          className="px-4 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 font-medium transition-colors"
                        >
                          Cancelar reserva
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
