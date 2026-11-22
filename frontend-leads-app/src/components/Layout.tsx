import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { toast } from '../toast';
import { Tooltip } from './Tooltip';

export function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M13 2 4 14h6l-1 8 9-12h-6z" />
      </svg>
    </span>
  );
}

export function Layout() {
  const { agent, logout } = useAuth();

  return (
    <>
      <header className="topbar">
        <Link to="/leads" className="brand">
          <BrandMark />
          <span className="brand-text">
            CRM · Leads comerciales
            <small>Gana Energía</small>
          </span>
        </Link>
        <nav>
          <NavLink to="/leads">Leads</NavLink>
          {agent?.rol === 'ADMIN' && (
            <Tooltip text="Configura los pesos con los que se calcula la puntuación (solo administradores)">
              <NavLink to="/weights">Pesos</NavLink>
            </Tooltip>
          )}
        </nav>
        <div className="user">
          <span className="avatar" aria-hidden="true">
            {(agent?.nombre ?? '?').trim().charAt(0).toUpperCase()}
          </span>
          <span className="user-info">
            {agent?.nombre} <small>({agent?.rol === 'ADMIN' ? 'administrador' : 'agente'})</small>
          </span>
          <Tooltip text="Cierra tu sesión en este navegador" align="end">
            <button
              className="btn btn-small"
              onClick={() => {
                logout();
                toast.info('Sesión cerrada');
              }}
            >
              Salir
            </button>
          </Tooltip>
        </div>
      </header>
      <main className="container">
        <Outlet />
      </main>
    </>
  );
}
