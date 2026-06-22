import type {
  Booking,
  CreateBookingRequest,
  CreateEventTypeRequest,
  EventType,
  ErrorResponse,
  Slot,
  UpdateEventTypeRequest,
} from './types';

const API_BASE = '/api';

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function parseError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as ErrorResponse;
    if (body.message) {
      return body.message;
    }
  } catch {
    // ignore parse errors
  }
  return `HTTP ${response.status}`;
}

async function request<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const message = await parseError(response);
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function listEventTypes(): Promise<EventType[]> {
  return request<EventType[]>('/event-types');
}

export function getEventType(id: string): Promise<EventType> {
  return request<EventType>(`/event-types/${id}`);
}

export function createEventType(body: CreateEventTypeRequest): Promise<EventType> {
  return request<EventType>('/event-types', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateEventType(
  id: string,
  body: UpdateEventTypeRequest,
): Promise<EventType> {
  return request<EventType>(`/event-types/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export function deleteEventType(id: string): Promise<void> {
  return request<void>(`/event-types/${id}`, { method: 'DELETE' });
}

export function listSlots(id: string, date: string): Promise<Slot[]> {
  return request<Slot[]>(`/event-types/${id}/slots?date=${encodeURIComponent(date)}`);
}

export function listBookings(): Promise<Booking[]> {
  return request<Booking[]>('/bookings');
}

export function createBooking(body: CreateBookingRequest): Promise<Booking> {
  return request<Booking>('/bookings', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function deleteBooking(id: string): Promise<void> {
  return request<void>(`/bookings/${id}`, { method: 'DELETE' });
}
