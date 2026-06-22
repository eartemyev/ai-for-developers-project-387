import { useCallback, useEffect, useState } from 'react';
import {
  createEventType,
  deleteBooking,
  deleteEventType,
  listBookings,
  listEventTypes,
  updateEventType,
} from '../api';
import type { Booking, EventType } from '../api';
import { LoadingState } from '../components/LoadingState';
import { StatusMessage } from '../components/StatusMessage';
import { formatDateLongRu, formatSlotRangeUtc } from '../utils/dates';

interface EventTypeFormState {
  name: string;
  description: string;
  durationMinutes: string;
}

const emptyForm = (): EventTypeFormState => ({
  name: '',
  description: '',
  durationMinutes: '30',
});

export function AdminPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EventTypeFormState>(emptyForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setError(null);
      try {
        const [bookingsData, eventTypesData] = await Promise.all([
          listBookings(),
          listEventTypes(),
        ]);
        if (!cancelled) {
          setBookings(bookingsData);
          setEventTypes(eventTypesData);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Ошибка загрузки');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [bookingsData, eventTypesData] = await Promise.all([
        listBookings(),
        listEventTypes(),
      ]);
      setBookings(bookingsData);
      setEventTypes(eventTypesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, []);

  const startEdit = (et: EventType) => {
    setEditingId(et.id);
    setForm({
      name: et.name,
      description: et.description,
      durationMinutes: String(et.durationMinutes),
    });
    setFormError(null);
  };

  const startCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setFormError(null);
  };

  const handleSaveEventType = async (e: React.FormEvent) => {
    e.preventDefault();
    const duration = Number(form.durationMinutes);
    if (!form.name.trim() || !Number.isInteger(duration) || duration <= 0) {
      setFormError('Укажите название и длительность (целое число минут).');
      return;
    }

    setSaving(true);
    setFormError(null);

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      durationMinutes: duration,
    };

    try {
      if (editingId) {
        await updateEventType(editingId, payload);
      } else {
        await createEventType(payload);
      }
      startCreate();
      await loadData();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEventType = async (id: string) => {
    try {
      await deleteEventType(id);
      if (editingId === id) startCreate();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка удаления типа события');
    }
  };

  const handleCancelBooking = async (id: string) => {
    try {
      await deleteBooking(id);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка отмены бронирования');
    }
  };

  if (loading) return <LoadingState />;

  return (
    <div className="admin">
      <h1 className="page-heading">Админка</h1>
      {error && <StatusMessage variant="error">{error}</StatusMessage>}

      <section className="admin-section card">
        <h2>Предстоящие встречи</h2>
        {bookings.length === 0 ? (
          <StatusMessage variant="info">Нет предстоящих встреч.</StatusMessage>
        ) : (
          <ul className="booking-list">
            {bookings.map((b) => {
              const date = new Date(b.startsAt);
              return (
                <li key={b.id} className="booking-list-item">
                  <div>
                    <strong>{b.eventTypeName}</strong>
                    <span className="booking-list-meta">
                      {formatDateLongRu(date)},{' '}
                      {formatSlotRangeUtc(b.startsAt, b.endsAt)} (UTC)
                    </span>
                    <span className="booking-list-meta">
                      {b.guestName} · {b.guestEmail}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn btn--danger btn--small"
                    onClick={() => handleCancelBooking(b.id)}
                  >
                    Отменить
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="admin-section card">
        <h2>Типы событий</h2>
        <form className="form event-type-form" onSubmit={handleSaveEventType}>
          <label className="field">
            <span className="field-label">Название</span>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </label>
          <label className="field">
            <span className="field-label">Описание</span>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </label>
          <label className="field">
            <span className="field-label">Длительность (мин)</span>
            <input
              type="number"
              min={1}
              value={form.durationMinutes}
              onChange={(e) => setForm((f) => ({ ...f, durationMinutes: e.target.value }))}
              required
            />
          </label>
          {formError && <StatusMessage variant="error">{formError}</StatusMessage>}
          <div className="actions">
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? 'Сохранение…' : editingId ? 'Сохранить' : 'Создать'}
            </button>
            {editingId && (
              <button type="button" className="btn btn--secondary" onClick={startCreate}>
                Отмена
              </button>
            )}
          </div>
        </form>

        <ul className="event-type-list">
          {eventTypes.map((et) => (
            <li key={et.id} className="event-type-list-item">
              <div>
                <strong>{et.name}</strong>
                <span className="booking-list-meta">
                  {et.durationMinutes} мин · {et.description || 'Без описания'}
                </span>
              </div>
              <div className="actions actions--inline">
                <button
                  type="button"
                  className="btn btn--secondary btn--small"
                  onClick={() => startEdit(et)}
                >
                  Редактировать
                </button>
                <button
                  type="button"
                  className="btn btn--danger btn--small"
                  onClick={() => handleDeleteEventType(et.id)}
                >
                  Удалить
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
