import type { Route } from '../hooks/useHashRoute';

interface LayoutProps {
  route: Route;
  onNavigate: (route: Route) => void;
  children: React.ReactNode;
}

export function Layout({ route, onNavigate, children }: LayoutProps) {
  const isCatalog = route.page === 'catalog' || route.page === 'booking';
  const isAdmin = route.page === 'admin';

  return (
    <div className="app">
      <header className="header">
        <div className="header-brand">
          <span className="header-logo" aria-hidden="true">📅</span>
          <span className="header-title">Calendar</span>
        </div>
        <nav className="header-nav">
          <button
            type="button"
            className={`nav-btn ${isCatalog ? 'nav-btn--active' : ''}`}
            onClick={() => onNavigate({ page: 'catalog' })}
          >
            Записаться
          </button>
          <button
            type="button"
            className={`nav-btn ${isAdmin ? 'nav-btn--active' : ''}`}
            onClick={() => onNavigate({ page: 'admin' })}
          >
            Админка
          </button>
        </nav>
      </header>
      <main className="main">{children}</main>
    </div>
  );
}
