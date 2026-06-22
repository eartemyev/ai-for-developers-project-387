import { useCallback, useEffect, useState } from 'react';

export type Route =
  | { page: 'catalog' }
  | { page: 'booking'; eventTypeId: string }
  | { page: 'admin' };

function parseHash(hash: string): Route {
  const path = hash.replace(/^#/, '') || '/';

  if (path === '/' || path === '') {
    return { page: 'catalog' };
  }

  if (path === '/admin') {
    return { page: 'admin' };
  }

  const bookingMatch = path.match(/^\/event-types\/([^/]+)$/);
  if (bookingMatch) {
    return { page: 'booking', eventTypeId: bookingMatch[1] };
  }

  return { page: 'catalog' };
}

function routeToHash(route: Route): string {
  switch (route.page) {
    case 'catalog':
      return '#/';
    case 'admin':
      return '#/admin';
    case 'booking':
      return `#/event-types/${route.eventTypeId}`;
  }
}

export function useHashRoute() {
  const [route, setRouteState] = useState<Route>(() =>
    parseHash(window.location.hash),
  );

  useEffect(() => {
    const onHashChange = () => setRouteState(parseHash(window.location.hash));
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = useCallback((next: Route) => {
    const hash = routeToHash(next);
    if (window.location.hash !== hash) {
      window.location.hash = hash;
    } else {
      setRouteState(next);
    }
  }, []);

  return { route, navigate };
}
