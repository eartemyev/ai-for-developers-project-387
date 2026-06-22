import { useEffect, useState } from 'react';
import { listEventTypes } from '../api';
import type { EventType } from '../api';
import type { Route } from '../hooks/useHashRoute';
import { LoadingState } from '../components/LoadingState';
import { StatusMessage } from '../components/StatusMessage';

const OWNER_NAME = 'Евгений';
const OWNER_ROLE = 'Пользователь';

interface CatalogPageProps {
  onNavigate: (route: Route) => void;
}

export function CatalogPage({ onNavigate }: CatalogPageProps) {
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Data fetch on mount
    void listEventTypes()
      .then((data) => {
        if (!cancelled) setEventTypes(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Ошибка загрузки');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="catalog">
      <section className="card owner-card">
        <div className="owner-info">
          <div className="avatar" aria-hidden="true">🙂</div>
          <div>
            <div className="owner-name">{OWNER_NAME}</div>
            <div className="owner-role">{OWNER_ROLE}</div>
          </div>
        </div>
        <h1 className="page-title">Выберите тип события</h1>
        <p className="page-subtitle">
          Нажмите на карточку, чтобы открыть календарь и выбрать удобный слот.
        </p>
      </section>

      {loading && <LoadingState />}
      {error && <StatusMessage variant="error">{error}</StatusMessage>}

      {!loading && !error && (
        <div className="event-grid">
          {eventTypes.map((et) => (
            <button
              key={et.id}
              type="button"
              className="card event-card"
              onClick={() => onNavigate({ page: 'booking', eventTypeId: et.id })}
            >
              <span className="duration-badge">{et.durationMinutes} мин</span>
              <h2 className="event-card-title">{et.name}</h2>
              <p className="event-card-desc">
                {et.description || 'Без описания'}
              </p>
            </button>
          ))}
          {eventTypes.length === 0 && (
            <StatusMessage variant="info">Типы событий ещё не созданы.</StatusMessage>
          )}
        </div>
      )}
    </div>
  );
}
