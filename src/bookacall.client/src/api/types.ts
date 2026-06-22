export interface ErrorResponse {
  message: string;
}

export interface EventType {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
}

export interface CreateEventTypeRequest {
  name: string;
  description?: string;
  durationMinutes: number;
}

export interface UpdateEventTypeRequest {
  name: string;
  description?: string;
  durationMinutes: number;
}

export interface Slot {
  startsAt: string;
  endsAt: string;
}

export interface Booking {
  id: string;
  eventTypeId: string;
  eventTypeName: string;
  startsAt: string;
  endsAt: string;
  guestName: string;
  guestEmail: string;
}

export interface CreateBookingRequest {
  eventTypeId: string;
  startsAt: string;
  guestName: string;
  guestEmail: string;
}
