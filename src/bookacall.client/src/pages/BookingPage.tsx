import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ApiError,
  createBooking,
  getEventType,
  listSlots,
} from '../api';
import type { EventType, Slot } from '../api';
import { LoadingState } from '../components/LoadingState';
import { StatusMessage } from '../components/StatusMessage';
import type { Route } from '../hooks/useHashRoute';
import {
  countFreeSlotsPerDate,
  formatDateKey,
  formatDateLongRu,
  formatMonthYearRu,
  formatSlotRangeUtc,
  generateAllSlots,
  getBookingWindowDates,
  mergeSlotsWithAvailability,
  parseDateKey,
  todayUtcDate,
} from '../utils/dates';

const OWNER_NAME = 'Евгений';
const OWNER_ROLE = 'Пользователь';

interface BookingPageProps {
  eventTypeId: string;
  onNavigate: (route: Route) => void;
}

type Step = 'select' | 'form' | 'success';

export function BookingPage({ eventTypeId, onNavigate }: BookingPageProps) {
  const [eventType, setEventType] = useState<EventType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const windowDates = useMemo(() => getBookingWindowDates(), []);
  const [selectedDateKey, setSelectedDateKey] = useState(() => formatDateKey(todayUtcDate()));
  const [calendarMonth, setCalendarMonth] = useState(() => todayUtcDate());

  const [freeSlots, setFreeSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [slotCounts, setSlotCounts] = useState<Record<string, number>>({});

  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [step, setStep] = useState<Step>('select');

  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Data fetch when event type changes
    void getEventType(eventTypeId)
      .then((data) => {
        if (!cancelled) setEventType(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Ошибка загрузки');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [eventTypeId]);

  const loadSlotCounts = useCallback(() => {
    countFreeSlotsPerDate(eventTypeId, windowDates, listSlots).then(setSlotCounts);
  }, [eventTypeId, windowDates]);

  useEffect(() => {
    if (eventType) {
      loadSlotCounts();
    }
  }, [eventType, loadSlotCounts]);

  useEffect(() => {
    if (!eventType) return;

    let cancelled = false;

    void listSlots(eventTypeId, selectedDateKey)
      .then((data) => {
        if (!cancelled) setFreeSlots(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setSlotsError(err instanceof Error ? err.message : 'Ошибка загрузки слотов');
          setFreeSlots([]);
        }
      })
      .finally(() => {
        if (!cancelled) setSlotsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [eventTypeId, selectedDateKey, eventType]);

  const allSlots = useMemo(() => {
    if (!eventType) return [];
    return generateAllSlots(selectedDateKey, eventType.durationMinutes);
  }, [eventType, selectedDateKey]);

  const slotsWithStatus = useMemo(
    () => mergeSlotsWithAvailability(allSlots, freeSlots),
    [allSlots, freeSlots],
  );

  const selectedDate = parseDateKey(selectedDateKey);
  const windowDateKeys = new Set(windowDates.map(formatDateKey));

  const calendarCells = useMemo(() => {
    const year = calendarMonth.getUTCFullYear();
    const month = calendarMonth.getUTCMonth();
    const firstDay = new Date(Date.UTC(year, month, 1));
    const startOffset = (firstDay.getUTCDay() + 6) % 7;
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

    const cells: Array<{ date: Date | null; key: string | null }> = [];
    for (let i = 0; i < startOffset; i++) {
      cells.push({ date: null, key: null });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(Date.UTC(year, month, d));
      cells.push({ date, key: formatDateKey(date) });
    }
    return cells;
  }, [calendarMonth]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventType || !selectedSlot) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      await createBooking({
        eventTypeId: eventType.id,
        startsAt: selectedSlot.startsAt,
        guestName: guestName.trim(),
        guestEmail: guestEmail.trim(),
      });
      setStep('success');
      loadSlotCounts();
    } catch (err) {
      if (err instanceof ApiError) {
        setSubmitError(err.message);
      } else {
        setSubmitError('Не удалось создать бронирование');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingState />;
  if (error || !eventType) {
    return (
      <StatusMessage variant="error">
        {error ?? 'Тип события не найден'}
      </StatusMessage>
    );
  }

  if (step === 'success') {
    return (
      <div className="booking-success card">
        <h2>Бронирование подтверждено</h2>
        <p>
          {eventType.name}, {formatDateLongRu(selectedDate)},{' '}
          {selectedSlot && formatSlotRangeUtc(selectedSlot.startsAt, selectedSlot.endsAt)} (UTC)
        </p>
        <div className="actions">
          <button type="button" className="btn btn--secondary" onClick={() => onNavigate({ page: 'catalog' })}>
            К каталогу
          </button>
        </div>
      </div>
    );
  }

  if (step === 'form' && selectedSlot) {
    return (
      <div className="booking-form-page">
        <h1 className="page-heading">{eventType.name}</h1>
        <div className="card booking-form-card">
          <p className="booking-summary">
            {formatDateLongRu(selectedDate)},{' '}
            {formatSlotRangeUtc(selectedSlot.startsAt, selectedSlot.endsAt)} (UTC)
          </p>
          <form onSubmit={handleSubmit} className="form">
            <label className="field">
              <span className="field-label">Имя</span>
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                required
                autoComplete="name"
              />
            </label>
            <label className="field">
              <span className="field-label">Email</span>
              <input
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </label>
            {submitError && <StatusMessage variant="error">{submitError}</StatusMessage>}
            <div className="actions">
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => setStep('select')}
                disabled={submitting}
              >
                Назад
              </button>
              <button type="submit" className="btn btn--primary" disabled={submitting}>
                {submitting ? 'Отправка…' : 'Забронировать'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="booking">
      <h1 className="page-heading">{eventType.name}</h1>
      <p className="timezone-hint">Время отображается в UTC (серверное время).</p>

      <div className="booking-grid">
        <section className="card booking-info">
          <div className="owner-info">
            <div className="avatar" aria-hidden="true">🙂</div>
            <div>
              <div className="owner-name">{OWNER_NAME}</div>
              <div className="owner-role">{OWNER_ROLE}</div>
            </div>
          </div>
          <div className="event-meta">
            <h2>{eventType.name}</h2>
            <span className="duration-badge">{eventType.durationMinutes} мин</span>
          </div>
          <p className="event-card-desc">
            {eventType.description || 'Без описания'}
          </p>
          <div className="selection-summary">
            <div className="summary-row">
              <span className="summary-label">Выбранная дата</span>
              <span>{formatDateLongRu(selectedDate)}</span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Выбранное время</span>
              <span>
                {selectedSlot
                  ? `${formatSlotRangeUtc(selectedSlot.startsAt, selectedSlot.endsAt)} (UTC)`
                  : 'Время не выбрано'}
              </span>
            </div>
          </div>
        </section>

        <section className="card calendar-card">
          <div className="calendar-header">
            <h2>Календарь</h2>
            <div className="calendar-nav">
              <button
                type="button"
                className="btn-icon"
                aria-label="Предыдущий месяц"
                onClick={() => {
                  const d = new Date(calendarMonth);
                  d.setUTCMonth(d.getUTCMonth() - 1);
                  setCalendarMonth(d);
                }}
              >
                ‹
              </button>
              <span>{formatMonthYearRu(calendarMonth)}</span>
              <button
                type="button"
                className="btn-icon"
                aria-label="Следующий месяц"
                onClick={() => {
                  const d = new Date(calendarMonth);
                  d.setUTCMonth(d.getUTCMonth() + 1);
                  setCalendarMonth(d);
                }}
              >
                ›
              </button>
            </div>
          </div>
          <div className="calendar-weekdays">
            {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="calendar-grid">
            {calendarCells.map((cell, i) => {
              if (!cell.date || !cell.key) {
                return <span key={`empty-${i}`} className="calendar-cell calendar-cell--empty" />;
              }
              const inWindow = windowDateKeys.has(cell.key);
              const isSelected = cell.key === selectedDateKey;
              const count = slotCounts[cell.key];

              return (
                <button
                  key={cell.key}
                  type="button"
                  disabled={!inWindow}
                  className={`calendar-cell ${isSelected ? 'calendar-cell--selected' : ''} ${!inWindow ? 'calendar-cell--disabled' : ''}`}
                  onClick={() => {
                    setSlotsLoading(true);
                    setSlotsError(null);
                    setSelectedSlot(null);
                    setSelectedDateKey(cell.key!);
                  }}
                >
                  <span className="calendar-day">{cell.date.getUTCDate()}</span>
                  {inWindow && count !== undefined && (
                    <span className="calendar-count">{count} св.</span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <section className="card slots-card">
          <h2>Статус слотов</h2>
          {slotsLoading && <LoadingState message="Загрузка слотов…" />}
          {slotsError && <StatusMessage variant="error">{slotsError}</StatusMessage>}
          {!slotsLoading && !slotsError && (
            <ul className="slot-list">
              {slotsWithStatus.map((slot) => {
                const isSelected =
                  selectedSlot !== null &&
                  new Date(selectedSlot.startsAt).getTime() ===
                    new Date(slot.startsAt).getTime();
                return (
                  <li key={slot.startsAt}>
                    <button
                      type="button"
                      disabled={!slot.available}
                      className={`slot-item ${slot.available ? 'slot-item--free' : 'slot-item--busy'} ${isSelected ? 'slot-item--selected' : ''}`}
                      onClick={() => slot.available && setSelectedSlot(slot)}
                    >
                      <span>{formatSlotRangeUtc(slot.startsAt, slot.endsAt)}</span>
                      <span className="slot-status">
                        {slot.available ? 'Свободно' : 'Занято'}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="actions">
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => onNavigate({ page: 'catalog' })}
            >
              Назад
            </button>
            <button
              type="button"
              className="btn btn--primary"
              disabled={!selectedSlot}
              onClick={() => setStep('form')}
            >
              Продолжить
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
