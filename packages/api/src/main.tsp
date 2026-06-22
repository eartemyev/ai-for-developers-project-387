import "@typespec/http";
import "@typespec/openapi3";

using TypeSpec.Http;

/**
 * Book a call API — a minimal scheduling service without authentication.
 *
 * Roles:
 * - Owner: predefined singleton profile used by the admin UI (no auth endpoints).
 * - Guest: browses event types and books free slots without an account.
 *
 * Business rules:
 * - Booking window: 14 days from the current date (inclusive).
 * - No double booking: the same startsAt cannot be booked twice, even across event types.
 * - Slots are computed server-side from event type duration and existing bookings.
 */
@service({ title: "Book a call API" })
namespace BookACall;

/** Generic error response body */
model ErrorResponse {
  message: string;
}

/**
 * Calendar owner — a single predefined profile.
 * Not exposed via REST; documented for domain clarity only.
 */
model Owner {
  id: string;
  name: string;
}

/** A single available time slot (computed, not persisted) */
model Slot {
  startsAt: utcDateTime;
  endsAt: utcDateTime;
}

/** A meeting type that guests can book */
model EventType {
  id: string;
  name: string;
  description: string;
  durationMinutes: int32;
}

/** Request body for creating a new event type */
model CreateEventTypeRequest {
  name: string;
  description?: string;
  durationMinutes: int32;
}

/** Request body for fully replacing an event type */
model UpdateEventTypeRequest {
  name: string;
  description?: string;
  durationMinutes: int32;
}

/** A confirmed booking */
model Booking {
  id: string;
  eventTypeId: string;
  eventTypeName: string;
  startsAt: utcDateTime;
  endsAt: utcDateTime;
  guestName: string;
  guestEmail: string;
}

/** Request body for creating a new booking */
model CreateBookingRequest {
  eventTypeId: string;
  startsAt: utcDateTime;
  guestName: string;
  guestEmail: string;
}

@route("/api/event-types")
interface EventTypes {
  /** List all event types (guest browse page and owner management) */
  @get
  list(): EventType[];

  /** Get a single event type by id */
  @route("{id}")
  @get
  get(@path id: string): EventType | NotFoundResponse;

  /** Create a new event type (owner) */
  @post
  create(@body body: CreateEventTypeRequest): {
    @statusCode statusCode: 201;
    @body body: EventType;
  };

  /** Fully replace an existing event type (owner) */
  @route("{id}")
  @put
  update(@path id: string, @body body: UpdateEventTypeRequest):
    | EventType
    | NotFoundResponse;

  /** Delete an event type (owner) */
  @route("{id}")
  @delete
  delete(@path id: string): {
    @statusCode statusCode: 204;
  } | NotFoundResponse;

  /**
   * List available slots for an event type on a given date.
   * Returns 400 if date is before today or more than 14 days ahead.
   * Returns 404 if the event type is not found.
   */
  @route("{id}/slots")
  @get
  slots(
    @path id: string,
    @query date: string,
  ):
    | Slot[]
    | { @statusCode statusCode: 400; @body body: ErrorResponse; }
    | NotFoundResponse;
}

@route("/api/bookings")
interface Bookings {
  /**
   * Create a booking (guest).
   * Returns 400 if startsAt is in the past or outside the 14-day window.
   * Returns 404 if eventTypeId is unknown.
   * Returns 409 if the slot is already booked (same startsAt, any event type).
   */
  @post
  create(@body body: CreateBookingRequest):
    | { @statusCode statusCode: 201; @body body: Booking; }
    | { @statusCode statusCode: 400; @body body: ErrorResponse; }
    | { @statusCode statusCode: 404; @body body: ErrorResponse; }
    | { @statusCode statusCode: 409; @body body: ErrorResponse; };

  /** List upcoming bookings sorted by startsAt ASC (owner) */
  @get
  list(): Booking[];

  /** Cancel a booking by id (owner) */
  @route("{id}")
  @delete
  delete(@path id: string):
    | { @statusCode _: 204; }
    | NotFoundResponse;
}
