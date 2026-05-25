# TableSite API — cURL Examples

> Import any `curl` command directly into **Postman** via  
> **Import → Raw Text** and paste the command.  
> Or use **Import → cURL** in the Postman request editor.

**Base URL:** `http://localhost:3001/api/v1`

Replace the following placeholders throughout this file:

| Placeholder | Replace with |
|-------------|-------------|
| `<admin_token>` | JWT from `POST /auth/login` (admin account) |
| `<owner_token>` | JWT from `POST /auth/login` (owner account) |
| `<customer_token>` | JWT from `POST /auth/login` (customer account) |
| `<token>` | Any valid JWT |

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Restaurants (Public)](#2-restaurants-public)
3. [Menus (Public)](#3-menus-public)
4. [Bookings](#4-bookings)
5. [Admin Panel](#5-admin-panel)
   - [Dashboard](#51-dashboard)
   - [Users](#52-users)
   - [Restaurants](#53-restaurants)
   - [Bookings](#54-bookings)
   - [Restaurant Requests](#55-restaurant-requests)
6. [Owner Panel](#6-owner-panel)
   - [Dashboard](#61-dashboard)
   - [Restaurants](#62-restaurants)
   - [Bookings](#63-bookings)
   - [Restaurant Requests](#64-restaurant-requests)

---

## 1. Authentication

### Register a new user

```bash
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Jane",
    "last_name": "Doe",
    "email": "jane@example.com",
    "password": "secret123",
    "phone": "+855 12 345 678",
    "role": "CUSTOMER"
  }'
```

### Register an owner

```bash
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "John",
    "last_name": "Smith",
    "email": "owner@example.com",
    "password": "secret123",
    "role": "OWNER"
  }'
```

### Login (customer / owner)

```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "jane@example.com",
    "password": "secret123"
  }'
```

### Login (admin)

```bash
curl -X POST http://localhost:3001/api/v1/auth/login-admin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@tablesite.com",
    "password": "adminpass"
  }'
```

### Get current user profile (`/me`)

```bash
curl http://localhost:3001/api/v1/auth/me \
  -H "Authorization: Bearer <token>"
```

### Update own profile

```bash
curl -X PUT http://localhost:3001/api/v1/auth/update-user \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Janet",
    "phone": "+855 98 765 432"
  }'
```

### Change password

```bash
curl -X PUT http://localhost:3001/api/v1/auth/change-password \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "current_password": "secret123",
    "new_password": "newpassword456"
  }'
```

### Logout

```bash
curl -X POST http://localhost:3001/api/v1/auth/logout \
  -H "Authorization: Bearer <token>"
```

### Send OTP

```bash
curl -X POST http://localhost:3001/api/v1/auth/send-sms \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+85512345678",
    "is_debug": true
  }'
```

### Verify OTP

```bash
curl -X POST http://localhost:3001/api/v1/auth/verify-sms \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+85512345678",
    "otp": "1234"
  }'
```

---

## 2. Restaurants (Public)

### List all active restaurants

```bash
curl "http://localhost:3001/api/v1/restaurants"
```

### Search with filters

```bash
curl "http://localhost:3001/api/v1/restaurants?search=pizza&cuisine=Italian&location=Phnom+Penh&page=1&limit=10"
```

### Filter by price range

```bash
curl "http://localhost:3001/api/v1/restaurants?priceRate=low"
curl "http://localhost:3001/api/v1/restaurants?priceRate=medium"
curl "http://localhost:3001/api/v1/restaurants?priceRate=high"
```

### Sort results

```bash
# Newest first (default)
curl "http://localhost:3001/api/v1/restaurants?sortBy=newest"

# Highest rated
curl "http://localhost:3001/api/v1/restaurants?sortBy=rated"

# Most popular
curl "http://localhost:3001/api/v1/restaurants?sortBy=popular"
```

### Filter by guest count

```bash
curl "http://localhost:3001/api/v1/restaurants?guestCount=8"
```

### Get restaurant detail

```bash
curl http://localhost:3001/api/v1/restaurants/1
```

### List cities with restaurant counts

```bash
curl http://localhost:3001/api/v1/restaurants/addresses
```

### List cuisines with counts

```bash
curl http://localhost:3001/api/v1/restaurants/cuisines/list
```

### Toggle favourite

```bash
curl -X POST http://localhost:3001/api/v1/restaurants/favorites/toggle \
  -H "Authorization: Bearer <customer_token>" \
  -H "Content-Type: application/json" \
  -d '{ "restaurant_id": 1 }'
```

### List my favourites

```bash
curl http://localhost:3001/api/v1/restaurants/favorites/list \
  -H "Authorization: Bearer <customer_token>"
```

---

## 3. Menus (Public)

### List menus for a restaurant

```bash
curl http://localhost:3001/api/v1/restaurants/1/menus
```

### List items in a menu

```bash
curl http://localhost:3001/api/v1/restaurants/1/menus/2/items
```

### Create a menu (owner / admin)

```bash
curl -X POST http://localhost:3001/api/v1/restaurants/1/menus \
  -H "Authorization: Bearer <owner_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Dinner Menu",
    "description": "Our evening selection",
    "is_active": true
  }'
```

### Add a menu item

```bash
curl -X POST http://localhost:3001/api/v1/restaurants/1/menus/2/items \
  -H "Authorization: Bearer <owner_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Grilled Salmon",
    "description": "With lemon butter sauce",
    "price": 18.50,
    "category": "Main",
    "is_available": true,
    "is_gluten_free": true
  }'
```

### Update a menu

```bash
curl -X PUT http://localhost:3001/api/v1/restaurants/1/menus/2 \
  -H "Authorization: Bearer <owner_token>" \
  -H "Content-Type: application/json" \
  -d '{ "name": "Evening Menu", "is_active": true }'
```

### Delete a menu

```bash
curl -X DELETE http://localhost:3001/api/v1/restaurants/1/menus/2 \
  -H "Authorization: Bearer <owner_token>"
```

---

## 4. Bookings

### Create a booking (guest)

```bash
curl -X POST http://localhost:3001/api/v1/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "restaurant_id": 1,
    "booking_date": "2026-06-15",
    "booking_time": "19:00",
    "party_size": 4,
    "first_name": "Jane",
    "last_name": "Doe",
    "phone": "+85512345678",
    "email": "jane@example.com",
    "special_requests": "Window seat please"
  }'
```

### Create a booking (authenticated customer)

```bash
curl -X POST http://localhost:3001/api/v1/bookings \
  -H "Authorization: Bearer <customer_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "restaurant_id": 1,
    "booking_date": "2026-06-15",
    "booking_time": "19:00",
    "party_size": 2,
    "first_name": "Jane",
    "last_name": "Doe",
    "phone": "+85512345678",
    "occasion": "Anniversary"
  }'
```

### List my bookings (customer)

```bash
curl "http://localhost:3001/api/v1/bookings/customer" \
  -H "Authorization: Bearer <customer_token>"
```

### Get my booking detail

```bash
curl http://localhost:3001/api/v1/bookings/customer/5 \
  -H "Authorization: Bearer <customer_token>"
```

### Cancel my booking

```bash
curl -X POST http://localhost:3001/api/v1/bookings/customer/5/cancel \
  -H "Authorization: Bearer <customer_token>" \
  -H "Content-Type: application/json" \
  -d '{ "reason": "Change of plans" }'
```

---

## 5. Admin Panel

> All `/admin` routes require an admin JWT.
>
> ```bash
> -H "Authorization: Bearer <admin_token>"
> ```

### 5.1 Dashboard

```bash
curl http://localhost:3001/api/v1/admin/dashboard/stats \
  -H "Authorization: Bearer <admin_token>"
```

---

### 5.2 Users

#### List all users (paginated)

```bash
curl "http://localhost:3001/api/v1/admin/users?page=1&limit=10" \
  -H "Authorization: Bearer <admin_token>"
```

#### Search users

```bash
curl "http://localhost:3001/api/v1/admin/users?search=jane&page=1&limit=10" \
  -H "Authorization: Bearer <admin_token>"
```

#### Filter by role

```bash
curl "http://localhost:3001/api/v1/admin/users?role=owner" \
  -H "Authorization: Bearer <admin_token>"
```

#### Get a user by ID

```bash
curl http://localhost:3001/api/v1/admin/users/3 \
  -H "Authorization: Bearer <admin_token>"
```

#### Create a user

```bash
curl -X POST http://localhost:3001/api/v1/admin/users \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Owner",
    "email": "newowner@example.com",
    "password": "pass1234",
    "phone": "+855 77 000 001",
    "role": "owner"
  }'
```

#### Update a user

```bash
curl -X PUT http://localhost:3001/api/v1/admin/users/3 \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Name",
    "phone": "+855 77 000 002"
  }'
```

#### Update user status

```bash
# Suspend
curl -X PATCH http://localhost:3001/api/v1/admin/users/3/status \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{ "status": "suspended" }'

# Reactivate
curl -X PATCH http://localhost:3001/api/v1/admin/users/3/status \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{ "status": "active" }'
```

#### Delete a user

```bash
curl -X DELETE http://localhost:3001/api/v1/admin/users/3 \
  -H "Authorization: Bearer <admin_token>"
```

---

### 5.3 Restaurants

#### List all restaurants

```bash
curl "http://localhost:3001/api/v1/admin/restaurants?page=1&limit=10" \
  -H "Authorization: Bearer <admin_token>"
```

#### Filter by status

```bash
curl "http://localhost:3001/api/v1/admin/restaurants?status=pending" \
  -H "Authorization: Bearer <admin_token>"
```

#### Search restaurants

```bash
curl "http://localhost:3001/api/v1/admin/restaurants?search=bistro" \
  -H "Authorization: Bearer <admin_token>"
```

#### Update a restaurant

```bash
curl -X PUT http://localhost:3001/api/v1/admin/restaurants/1 \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Name",
    "city": "Siem Reap"
  }'
```

#### Approve a restaurant

```bash
curl -X PATCH http://localhost:3001/api/v1/admin/restaurants/1/status \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{ "status": "active" }'
```

#### Suspend a restaurant

```bash
curl -X PATCH http://localhost:3001/api/v1/admin/restaurants/1/status \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{ "status": "suspended" }'
```

#### Delete a restaurant

```bash
curl -X DELETE http://localhost:3001/api/v1/admin/restaurants/1 \
  -H "Authorization: Bearer <admin_token>"
```

---

### 5.4 Bookings

#### List all bookings

```bash
curl "http://localhost:3001/api/v1/admin/bookings?page=1&limit=10" \
  -H "Authorization: Bearer <admin_token>"
```

#### Filter by status

```bash
curl "http://localhost:3001/api/v1/admin/bookings?status=pending" \
  -H "Authorization: Bearer <admin_token>"
```

#### Search by customer or restaurant

```bash
curl "http://localhost:3001/api/v1/admin/bookings?search=jane" \
  -H "Authorization: Bearer <admin_token>"
```

#### Get a booking by ID

```bash
curl http://localhost:3001/api/v1/admin/bookings/10 \
  -H "Authorization: Bearer <admin_token>"
```

#### Update a booking

```bash
curl -X PUT http://localhost:3001/api/v1/admin/bookings/10 \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "confirmed",
    "date": "2026-06-20",
    "time": "20:00",
    "partySize": 6
  }'
```

#### Delete a booking

```bash
curl -X DELETE http://localhost:3001/api/v1/admin/bookings/10 \
  -H "Authorization: Bearer <admin_token>"
```

---

### 5.5 Restaurant Requests

#### List all slot requests

```bash
curl "http://localhost:3001/api/v1/admin/restaurant-requests?page=1&limit=10" \
  -H "Authorization: Bearer <admin_token>"
```

#### Filter by status

```bash
curl "http://localhost:3001/api/v1/admin/restaurant-requests?status=pending" \
  -H "Authorization: Bearer <admin_token>"
```

#### Approve a request

```bash
curl -X PUT http://localhost:3001/api/v1/admin/restaurant-requests/2/review \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "approved",
    "adminNote": "Approved. Your restaurant limit has been increased to 5."
  }'
```

#### Reject a request

```bash
curl -X PUT http://localhost:3001/api/v1/admin/restaurant-requests/2/review \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "rejected",
    "adminNote": "Please provide a more detailed business plan before reapplying."
  }'
```

---

## 6. Owner Panel

> All `/owner` routes require an owner JWT.
>
> ```bash
> -H "Authorization: Bearer <owner_token>"
> ```

### 6.1 Dashboard

```bash
curl http://localhost:3001/api/v1/owner/dashboard/stats \
  -H "Authorization: Bearer <owner_token>"
```

---

### 6.2 Restaurants

#### List my restaurants

```bash
curl "http://localhost:3001/api/v1/owner/restaurants?page=1&limit=10" \
  -H "Authorization: Bearer <owner_token>"
```

#### Get one of my restaurants

```bash
curl http://localhost:3001/api/v1/owner/restaurants/1 \
  -H "Authorization: Bearer <owner_token>"
```

#### Create a restaurant

```bash
curl -X POST http://localhost:3001/api/v1/owner/restaurants \
  -H "Authorization: Bearer <owner_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Bistro",
    "description": "A cozy French bistro in the heart of the city",
    "address": "123 Street 240",
    "city": "Phnom Penh",
    "phone": "+855 23 000 001",
    "email": "bistro@example.com",
    "cuisineType": "French",
    "capacity": 60,
    "openingTime": "11:00",
    "closingTime": "22:00"
  }'
```

#### Update a restaurant

```bash
curl -X PUT http://localhost:3001/api/v1/owner/restaurants/1 \
  -H "Authorization: Bearer <owner_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Bistro (Updated)",
    "closingTime": "23:00"
  }'
```

#### Delete a restaurant

```bash
curl -X DELETE http://localhost:3001/api/v1/owner/restaurants/1 \
  -H "Authorization: Bearer <owner_token>"
```

---

### 6.3 Bookings

#### List bookings across my restaurants

```bash
curl "http://localhost:3001/api/v1/owner/bookings?page=1&limit=10" \
  -H "Authorization: Bearer <owner_token>"
```

#### Filter by status

```bash
curl "http://localhost:3001/api/v1/owner/bookings?status=pending" \
  -H "Authorization: Bearer <owner_token>"
```

#### Filter by specific restaurant

```bash
curl "http://localhost:3001/api/v1/owner/bookings?restaurantId=1" \
  -H "Authorization: Bearer <owner_token>"
```

#### Get a booking detail

```bash
curl http://localhost:3001/api/v1/owner/bookings/10 \
  -H "Authorization: Bearer <owner_token>"
```

#### Confirm a booking

```bash
curl -X PUT http://localhost:3001/api/v1/owner/bookings/10 \
  -H "Authorization: Bearer <owner_token>" \
  -H "Content-Type: application/json" \
  -d '{ "status": "confirmed" }'
```

#### Cancel a booking

```bash
curl -X PUT http://localhost:3001/api/v1/owner/bookings/10 \
  -H "Authorization: Bearer <owner_token>" \
  -H "Content-Type: application/json" \
  -d '{ "status": "cancelled" }'
```

#### Mark as completed

```bash
curl -X PUT http://localhost:3001/api/v1/owner/bookings/10 \
  -H "Authorization: Bearer <owner_token>" \
  -H "Content-Type: application/json" \
  -d '{ "status": "completed" }'
```

#### Mark as no-show

```bash
curl -X PUT http://localhost:3001/api/v1/owner/bookings/10 \
  -H "Authorization: Bearer <owner_token>" \
  -H "Content-Type: application/json" \
  -d '{ "status": "no_show" }'
```

---

### 6.4 Restaurant Requests

#### List my requests

```bash
curl "http://localhost:3001/api/v1/owner/restaurant-requests?page=1&limit=10" \
  -H "Authorization: Bearer <owner_token>"
```

#### Submit a new slot request

```bash
curl -X POST http://localhost:3001/api/v1/owner/restaurant-requests \
  -H "Authorization: Bearer <owner_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "requestedCount": 5,
    "reason": "We are expanding to two new cities and require additional restaurant slots to support our growing operations."
  }'
```

---

## Tips for Postman

1. **Set a base URL variable** — In Postman create an environment variable `base_url = http://localhost:3001/api/v1` and use `{{base_url}}/auth/login` in your requests.
2. **Auto-save token** — In the Login request's **Tests** tab add:
   ```js
   const res = pm.response.json();
   pm.environment.set("token", res.data.token);
   ```
   Then use `Bearer {{token}}` in all subsequent request headers.
3. **Import a curl** — Click **Import** in Postman → paste any curl command above → Postman converts it automatically.
