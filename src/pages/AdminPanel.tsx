import React, { useState, useEffect } from 'react';
import { Reservation } from '../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CheckCircle2, XCircle, Clock, ArrowLeft, Loader2, UserPlus, Trash2, KeyRound } from 'lucide-react';
import { Link } from 'react-router-dom';

interface AdminUser {
  id: number;
  name: string;
  email: string;
}

interface Credentials {
  email: string;
  password: string;
}

const SESSION_KEY = 'citro_admin_session';

export function AdminPanel() {
  const [checkingSetup, setCheckingSetup] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);

  const [creds, setCreds] = useState<Credentials | null>(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [currentAdmin, setCurrentAdmin] = useState<AdminUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // First-run setup form state
  const [setupMasterKey, setSetupMasterKey] = useState('');
  const [setupName, setSetupName] = useState('');
  const [setupEmail, setSetupEmail] = useState('');
  const [setupPassword, setSetupPassword] = useState('');
  const [setupError, setSetupError] = useState('');
  const [setupLoading, setSetupLoading] = useState(false);

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);

  // New admin form state
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [addAdminError, setAddAdminError] = useState('');
  const [addAdminLoading, setAddAdminLoading] = useState(false);

  const authHeaders = (c: Credentials) => ({
    'x-admin-email': c.email,
    'x-admin-password': c.password,
  });

  const login = async (candidate: Credentials): Promise<AdminUser> => {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(candidate),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Credenciales incorrectas');
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(candidate));
    setCreds(candidate);
    setCurrentAdmin(data.admin);
    setIsAuthenticated(true);
    return data.admin;
  };

  // On first load: find out if this is a brand-new install (no admins yet),
  // and otherwise try to restore the session saved for this browser tab.
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/setup-status');
        const data = await res.json();
        setNeedsSetup(!!data.needsSetup);

        if (!data.needsSetup && creds) {
          try {
            await login(creds);
            fetchData(creds);
          } catch {
            sessionStorage.removeItem(SESSION_KEY);
            setCreds(null);
          }
        }
      } catch {
        // If we can't reach the server, fall back to the normal login screen.
      } finally {
        setCheckingSetup(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoginError('');

    try {
      const candidate = { email: loginEmail, password: loginPassword };
      await login(candidate);
      fetchData(candidate);
    } catch (err: any) {
      setLoginError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetupLoading(true);
    setSetupError('');

    try {
      const res = await fetch('/api/admin/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          masterKey: setupMasterKey,
          name: setupName,
          email: setupEmail,
          password: setupPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo crear la cuenta');

      const candidate = { email: setupEmail, password: setupPassword };
      await login(candidate);
      fetchData(candidate);
    } catch (err: any) {
      setSetupError(err.message);
    } finally {
      setSetupLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setCreds(null);
    setCurrentAdmin(null);
    setIsAuthenticated(false);
  };

  const fetchData = async (activeCreds: Credentials) => {
    try {
      const [resData, adminsData] = await Promise.all([
        fetch('/api/reservations').then(r => r.json()),
        fetch('/api/admin/admins', { headers: authHeaders(activeCreds) }).then(r => r.json())
      ]);
      setReservations(resData);
      setAdmins(adminsData);
    } catch (error) {
      console.error("Error fetching admin data:", error);
    }
  };

  const handleUpdateStatus = async (id: number, status: 'CONFIRMED' | 'REJECTED' | 'CANCELLED') => {
    if (!creds) return;
    try {
      const res = await fetch(`/api/admin/reservations/${id}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(creds),
        },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(`Error: ${data.error}`);
        return;
      }

      fetchData(creds); // Refresh
    } catch (error) {
      alert("Error al actualizar la solicitud");
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creds) return;
    setAddAdminLoading(true);
    setAddAdminError('');
    try {
      const res = await fetch('/api/admin/admins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(creds),
        },
        body: JSON.stringify({ name: newAdminName, email: newAdminEmail, password: newAdminPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddAdminError(data.error || 'No se pudo añadir el administrador');
        return;
      }
      setNewAdminName('');
      setNewAdminEmail('');
      setNewAdminPassword('');
      fetchData(creds);
    } catch (error) {
      setAddAdminError("Error al añadir administrador");
    } finally {
      setAddAdminLoading(false);
    }
  };

  const handleDeleteAdmin = async (id: number) => {
    if (!creds) return;
    if (!confirm('¿Seguro que deseas eliminar este administrador? Perderá acceso al panel.')) return;
    try {
      const res = await fetch(`/api/admin/admins/${id}`, {
        method: 'DELETE',
        headers: authHeaders(creds),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(`Error: ${data.error}`);
        return;
      }
      fetchData(creds);
    } catch (error) {
      alert("Error al eliminar administrador");
    }
  };

  if (checkingSetup) {
    return <div className="min-h-screen bg-paper" />;
  }

  if (needsSetup) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center p-4">
        <div className="bg-surface p-8 rounded-2xl shadow-sm border border-border w-full max-w-md">
          <Link to="/" className="inline-flex items-center text-sm font-medium text-forest-light hover:text-forest mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver al inicio
          </Link>
          <div className="flex items-center gap-2 mb-2">
            <KeyRound className="w-5 h-5 text-forest" />
            <h2 className="text-2xl text-forest font-medium">Configuración Inicial</h2>
          </div>
          <p className="text-sm text-forest-light mb-6">
            Aún no hay administradores. Crea la primera cuenta usando la clave maestra
            definida en el servidor (variable <code className="font-mono">ADMIN_PASSWORD</code>).
          </p>
          <form onSubmit={handleSetup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-forest mb-1">Clave maestra del servidor</label>
              <input
                type="password"
                value={setupMasterKey}
                onChange={(e) => setSetupMasterKey(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface-alt text-forest focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-forest mb-1">Tu nombre</label>
              <input
                type="text"
                value={setupName}
                onChange={(e) => setSetupName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface-alt text-forest focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-forest mb-1">Tu correo</label>
              <input
                type="email"
                value={setupEmail}
                onChange={(e) => setSetupEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface-alt text-forest focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-forest mb-1">Elige una contraseña (mín. 8 caracteres)</label>
              <input
                type="password"
                value={setupPassword}
                onChange={(e) => setSetupPassword(e.target.value)}
                minLength={8}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface-alt text-forest focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest transition-all"
                required
              />
            </div>
            {setupError && <p className="text-red-600 text-sm">{setupError}</p>}
            <button
              type="submit"
              disabled={setupLoading}
              className="w-full py-2.5 rounded-xl bg-forest text-paper font-medium hover:bg-forest-light transition-colors flex justify-center items-center"
            >
              {setupLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Crear cuenta y entrar'}
            </button>
          </form>
        </div>
      </div>
    );
  }

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
              <label className="block text-sm font-medium text-forest mb-1">Correo</label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface-alt text-forest focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-forest mb-1">Contraseña</label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
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
              <p className="text-xs text-forest-light tracking-wide uppercase font-medium">
                CITRO {currentAdmin ? `· ${currentAdmin.name}` : ''}
              </p>
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
            <form onSubmit={handleAddAdmin} className="flex flex-wrap gap-4 mb-6 items-end">
              <div className="flex-1 min-w-[160px]">
                <label className="block text-xs font-medium text-forest mb-1">Nombre</label>
                <input type="text" required value={newAdminName} onChange={e => setNewAdminName(e.target.value)} className="w-full px-4 py-2 rounded-xl border border-border bg-surface-alt text-forest focus:outline-none focus:border-forest" />
              </div>
              <div className="flex-1 min-w-[160px]">
                <label className="block text-xs font-medium text-forest mb-1">Correo</label>
                <input type="email" required value={newAdminEmail} onChange={e => setNewAdminEmail(e.target.value)} className="w-full px-4 py-2 rounded-xl border border-border bg-surface-alt text-forest focus:outline-none focus:border-forest" />
              </div>
              <div className="flex-1 min-w-[160px]">
                <label className="block text-xs font-medium text-forest mb-1">Contraseña (mín. 8)</label>
                <input type="password" required minLength={8} value={newAdminPassword} onChange={e => setNewAdminPassword(e.target.value)} className="w-full px-4 py-2 rounded-xl border border-border bg-surface-alt text-forest focus:outline-none focus:border-forest" />
              </div>
              <button disabled={addAdminLoading} type="submit" className="px-6 py-2 rounded-xl bg-forest text-paper font-medium hover:bg-forest-light flex items-center gap-2 h-[42px]">
                {addAdminLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />} Añadir
              </button>
            </form>
            {addAdminError && <p className="text-red-600 text-sm mb-4">{addAdminError}</p>}

            <div className="space-y-3">
              {admins.map(admin => (
                <div key={admin.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-surface-alt">
                  <div>
                    <div className="font-medium text-forest">
                      {admin.name}
                      {currentAdmin?.id === admin.id && (
                        <span className="ml-2 text-xs font-normal text-forest-light">(tú)</span>
                      )}
                    </div>
                    <div className="text-sm text-forest-light">{admin.email}</div>
                  </div>
                  {currentAdmin?.id !== admin.id && (
                    <button onClick={() => handleDeleteAdmin(admin.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
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
