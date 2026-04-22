# Booking API Documentation

Base URL: `http://localhost:3000/api/v1/bookings`

## Authentication

All booking routes require `Authorization: Bearer <token>`.

---

## 1. Create Booking

Create a new booking. Only `CUSTOMER` can use this endpoint.

- Method: `POST`
- URL: `/create`

### curl example

```bash
curl -X POST http://localhost:3000/api/v1/bookings/create \
  -H "Authorization: Bearer <customer_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "restaurant_id": 123,
    "booking_date": "2026-04-15",
    "booking_time": "19:00",
    "party_size": 4,
    "duration_minutes": 90,
    "special_requests": "Window seat, please",
    "table_ids": [10, 11]
  }'
```

### Request body

- `restaurant_id` (number, required)
- `booking_date` (string, required, `YYYY-MM-DD`)
- `booking_time` (string, required, `HH:MM`)
- `party_size` (number, required)
- `duration_minutes` (number, optional)
- `special_requests` (string, optional)
- `table_ids` (number[], optional)

### Success response

- Status `201`
- Returns booking details with `status: PENDING`.

---

## 2. Get Customer Bookings

Fetch bookings for the authenticated customer.

- Method: `GET`
- URL: `/my-bookings`

### curl example

```bash
curl -X GET "http://localhost:3000/api/v1/bookings/my-bookings?status=CONFIRMED&page=1&limit=20" \
  -H "Authorization: Bearer <customer_token>"
```

### Query parameters

- `status` (optional): `PENDING`, `CONFIRMED`, `CANCELLED`, `COMPLETED`, `NO_SHOW`
- `booking_type` (optional): `history` or `upcoming`
- `page` (optional, default `1`)
- `limit` (optional, default `20`)

### Success response

- Status `200`
- Returns `data` array and `pagination` metadata.

---

## 3. Get Booking Detail

Fetch a booking by ID.

- Method: `GET`
- URL: `/:booking_id`

### curl example

```bash
curl -X GET http://localhost:3000/api/v1/bookings/456 \
  -H "Authorization: Bearer <token>"
```

### Success response

- Status `200`
- Returns booking details including restaurant, customer, tables, and timestamps.

---

## 4. Cancel Booking

Cancel a booking. Only the customer who created it can cancel.

- Method: `POST`
- URL: `/:booking_id/cancel`

### curl example

```bash
curl -X POST http://localhost:3000/api/v1/bookings/456/cancel \
  -H "Authorization: Bearer <customer_token>" \
  -H "Content-Type: application/json" \
  -d '{ "reason": "Change of plans" }'
```

### Notes

- Only `PENDING` and `CONFIRMED` bookings may be cancelled.

### Success response

- Status `200`
- Returns booking `id` and `status: CANCELLED`.

---

## 5. Get Restaurant Bookings

Fetch bookings for a restaurant. Allowed for restaurant `OWNER` and `ADMIN`.

- Method: `GET`
- URL: `/restaurant/:restaurant_id`

### curl example

```bash
curl -X GET "http://localhost:3000/api/v1/bookings/restaurant/123?status=PENDING&page=1&limit=20" \
  -H "Authorization: Bearer <owner_or_admin_token>"
```

### Query parameters

- `booking_id` (optional)
- `status` (optional)
- `customer_name` (optional)
- `booking_date` (optional)
- `date_from` (optional)
- `date_to` (optional)
- `page` (optional)
- `limit` (optional)

### Success response

- Status `200`
- Returns matching bookings and pagination details.

---

## 6. Accept Booking

Accept a pending booking and optionally assign tables.

- Method: `POST`
- URL: `/:booking_id/accept`

### curl example

```bash
curl -X POST http://localhost:3000/api/v1/bookings/456/accept \
  -H "Authorization: Bearer <owner_or_admin_token>" \
  -H "Content-Type: application/json" \
  -d '{ "table_ids": [10, 11] }'
```

### Notes

- Only `PENDING` bookings may be accepted.
- Status becomes `CONFIRMED`.

---

## 7. Reject Booking

Reject a pending booking.

- Method: `POST`
- URL: `/:booking_id/reject`

### curl example

```bash
curl -X POST http://localhost:3000/api/v1/bookings/456/reject \
  -H "Authorization: Bearer <owner_or_admin_token>" \
  -H "Content-Type: application/json" \
  -d '{ "reason": "No availability" }'
```

### Notes

- Only `PENDING` bookings may be rejected.
- Status becomes `CANCELLED`.

---

## 8. Update Booking Status

Update the booking status directly.

- Method: `PATCH`
- URL: `/:booking_id/status`

### curl example

```bash
curl -X PATCH http://localhost:3000/api/v1/bookings/456/status \
  -H "Authorization: Bearer <owner_or_admin_token>" \
  -H "Content-Type: application/json" \
  -d '{ "status": "COMPLETED" }'
```

### Notes

- Available to restaurant `OWNER` and `ADMIN`.

---

## Booking Status Flow

- `PENDING` — created by customer.
- `CONFIRMED` — accepted by restaurant.
- `CANCELLED` — cancelled by customer, rejected, or manually updated.
- `COMPLETED` — booking completed.
- `NO_SHOW` — confirmed booking with no arrival.

---

## Role Visibility

- `CUSTOMER`: own bookings, restaurant info, tables, and status.
- `OWNER`: bookings for their restaurant, customer contact, special requests, and assignments.
- `ADMIN`: full booking access and filters.
