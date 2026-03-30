import React from 'react';
import { NewsCarousel } from '../components/NewsCarousel';
import { useAuth, Role } from '../context/AuthContext';
import { LogIn, LogOut, Settings, Shield, User } from 'lucide-react';

export const Home: React.FC = () => {
  const { role, setRole, isAuthenticated, login, logout } = useAuth();

  const roles: Role[] = ['Director', 'Administrador', 'Coordinador', 'Usuario'];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-12">
      <header className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
            <span className="text-3xl font-bold font-serif tracking-tighter">M</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">CMNL App</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Ciudad Monumento</p>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-900 p-2 rounded-2xl border border-gray-200 dark:border-gray-700">
          {!isAuthenticated ? (
            <button
              onClick={login}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-medium transition-colors"
            >
              <LogIn size={18} />
              Iniciar Sesión
            </button>
          ) : (
            <>
              <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                <Shield size={16} className="text-blue-500" />
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                  className="bg-transparent text-sm font-medium text-gray-700 dark:text-gray-300 outline-none cursor-pointer"
                >
                  {roles.map((r) => (
                    <option key={r} value={r} className="dark:bg-gray-800">{r}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-2 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 px-4 py-2.5 rounded-xl font-medium transition-colors"
              >
                <LogOut size={18} />
                Salir
              </button>
            </>
          )}
        </div>
      </header>

      <main className="space-y-12">
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Últimas Noticias</h2>
            {isAuthenticated && (role === 'Administrador' || role === 'Director') && (
              <a
                href="/noticias/gestion"
                className="flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-900/30 px-4 py-2 rounded-full transition-colors"
              >
                <Settings size={16} />
                Gestión de Noticias
              </a>
            )}
          </div>
          <NewsCarousel />
        </section>

        {isAuthenticated && (
          <section className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Panel de Control ({role})</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Módulo de Música</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Gestiona la selección musical y reportes.</p>
                <a href="/musica/seleccion" className="text-blue-600 dark:text-blue-400 text-sm font-medium hover:underline">Ir a Selección &rarr;</a>
              </div>
              {/* Placeholder cards for other modules */}
              <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Agenda Editorial</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Planificación de contenidos y programas.</p>
                <span className="text-gray-400 text-sm font-medium">Próximamente</span>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Gestión de Equipo</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Administración de personal y roles.</p>
                <span className="text-gray-400 text-sm font-medium">Próximamente</span>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Transmisión</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Control de emisión en vivo.</p>
                <span className="text-gray-400 text-sm font-medium">Próximamente</span>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};
