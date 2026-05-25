# TableSite — Restaurant Table Booking API

A comprehensive Node.js/Express API for restaurant table management, bookings, and reservations. Built with TypeScript, Prisma ORM, and MySQL.

---

## Table of Contents

- [Recent Updates](#recent-updates)
- [Project Overview](#project-overview)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Setup Guide](#setup-guide)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
  - [Authentication](#authentication-v1auth)
  - [Restaurants (Public)](#restaurants-v1restaurants)
  - [Menus](#menus-v1restaurants)
  - [Bookings](#bookings-v1bookings)
  - [Admin Panel](#admin-panel-v1admin)
  - [Owner Panel](#owner-panel-v1owner)
- [Database Models](#database-models)
- [Environment Variables](#environment-variables)
- [Common Scripts](#common-scripts)
- [Troubleshooting](#troubleshooting)
- [cURL Examples (Postman)](src/docs/API_CURL_EXAMPLES.md)

---

## Recent Updates

### v1.2.0 — May 2026

- ✅ **Admin Panel API** — Full management surface: users, restaurants, bookings, restaurant requests (`/api/v1/admin/...`)
- ✅ **Owner Panel API** — Scoped owner operations: own restaurants, bookings, slot requests (`/api/v1/owner/...`)
- ✅ **Restaurant Slot Requests** — Owners can request increased restaurant limits; admins approve/reject with notes
- ✅ **`GET /auth/me`** — Alias for `/auth/profile` used by the management dashboard
- ✅ **`POST /auth/logout`** — Explicit logout endpoint (stateless JWT)
- ✅ **`parseParamId` helper** — Type-safe Express 5 route param parsing (`string | string[]` → `number`)

### v1.1.0 — May 2026

- ✅ **Price Range Filter** — Low / Medium / High restaurant filtering
- ✅ **Enhanced Restaurant Search** — Multi-field search with cuisine, location, guest count filters

---

## Project Overview

TableSite is a full-featured restaurant management API that powers both a **public-facing booking experience** and a **management dashboard** for admins and restaurant owners.

| Surface | Who uses it | Base path |
|---------|-------------|-----------|
| Auth | All users | `/api/v1/auth` |
| Public restaurants & menus | Customers / guests | `/api/v1/restaurants` |
| Bookings | Customers / guests | `/api/v1/bookings` |
| **Admin panel** | Admins | `/api/v1/admin` |
| **Owner panel** | Restaurant owners | `/api/v1/owner` |

Key capabilities:

- **Authentication & Authorization** — JWT-based auth with roles (Customer, Owner, Admin)
- **Restaurant Management** — Full CRUD, status control, slug generation
- **Table Management** — Seating and availability tracking
- **Booking System** — Reservations with full status lifecycle
- **Menu Management** — Menus and individual menu items
- **Reviews & Ratings** — Customer feedback
- **Restaurant Slot Requests** — Owners request capacity increases; admins approve/reject
- **Admin Controls** — Dashboard stats, user management, approval workflows

---

## Tech Stack

| Category | Library / Tool |
|----------|---------------|
| Runtime | Node.js v18+ |
| Language | TypeScript |
| Framework | Express.js v5 |
| Database | MySQL 8.0 |
| ORM | Prisma |
| Auth | JWT (jsonwebtoken) |
| Password | bcrypt |
| Validation | Zod |
| Security | Helmet, CORS |
| Logging | Morgan |
| Dev | Nodemon |

---

## Prerequisites

1. **Node.js v18+** — [nodejs.org](https://nodejs.org/)
2. **MySQL 8.0+** — [mysql.com](https://dev.mysql.com/downloads/mysql/) or Docker:
   ```bash
   docker run --name mysql -e MYSQL_ROOT_PASSWORD=root -p 3306:3306 -d mysql:8.0
   ```
3. **Git** (optional) — [git-scm.com](https://git-scm.com/)

---

## Setup Guide

### 1. Clone / navigate to the project

```bash
git clone <repository-url> && cd TableSite
# or just: cd /path/to/TableSite
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create `.env`

```env
# Database
DATABASE_URL="mysql://root:password@localhost:3306/tablesite_db"

# Server
PORT=3001
NODE_ENV=development

# JWT
JWT_SECRET=your_super_secret_key_here
JWT_EXPIRES_IN=7d
```

### 4. Create the database

```sql
CREATE DATABASE tablesite_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 5. Generate the Prisma client

```bash
npm run prisma:generate
```

### 6. Run migrations

```bash
npm run prisma:migrate
```

> **After adding `RestaurantRequest`:** if upgrading from an earlier version run:
> ```bash
> npx prisma migrate dev --name add_restaurant_request
> ```

### 7. Start the dev server

```bash
npm run dev
```

The API is available at `http://localhost:3001/api/v1`.

### Bonus: Prisma Studio

```bash
npx prisma studio   # opens http://localhost:5555
```

---

## Project Structure

```
TableSite/
├── src/
│   ├── controllers/
│   │   ├── auth.controller.ts          # register, login, profile, logout
│   │   ├── restaurant.controller.ts    # public restaurant CRUD
│   │   ├── booking.controller.ts       # customer/guest bookings
│   │   ├── menu.controller.ts          # menus & menu items
│   │   ├── admin.controller.ts         # ★ admin panel handlers
│   │   └── owner.controller.ts         # ★ owner panel handlers
│   ├── routes/
│   │   ├── index.ts                    # root router
│   │   ├── auth.route.ts
│   │   ├── restaurant.route.ts
│   │   ├── booking.route.ts
│   │   ├── menu.route.ts
│   │   ├── admin.route.ts              # ★ /api/v1/admin
│   │   └── owner.route.ts              # ★ /api/v1/owner
│   ├── middlewares/
│   │   ├── auth.middleware.ts          # JWT + role guard
│   │   ├── error.middleware.ts
│   │   └── notFound.middleware.ts
│   ├── schemas/                        # Zod validation schemas
│   │   ├── auth.schema.ts
│   │   ├── restaurant.schema.ts
│   │   ├── booking.schema.ts
│   │   ├── menu.schema.ts
│   │   └── common.schema.ts
│   ├── util/
│   │   ├── helper.ts                   # successResponse, asyncHandler, parseParamId
│   │   ├── index.util.ts
│   │   ├── prisma.ts                   # Prisma client singleton
│   │   └── restaurant-importer.ts
│   ├── errors/
│   │   └── AppError.ts
│   ├── constants/
│   │   └── index.constants.ts
│   ├── docs/
│   │   ├── BOOKING_API.md
│   │   ├── MENU_API.md
│   │   └── RESTAURANT_API.md
│   ├── types/
│   │   └── express.d.ts
│   ├── app.ts
│   └── index.ts
├── prisma/
│   ├── schema.prisma                   # single source of truth for DB schema
│   └── migrations/
├── generated/
│   └── prisma/                         # auto-generated Prisma client
├── .env                                # ← create this (not committed)
├── tsconfig.json
├── package.json
└── README.md
```

---

## API Reference

### Base URL

```
http://localhost:3001/api/v1
```

All responses follow this envelope:

```json
{
  "success": true,
  "message": "...",
  "data": { ... }
}
```

Paginated responses include:

```json
{
  "data": [...],
  "total": 100,
  "page": 1,
  "limit": 10,
  "totalPages": 10
}
```

---

### Authentication (`/v1/auth`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/register` | — | Register a new user (any role) |
| POST | `/login` | — | Login (customer / owner) |
| POST | `/login-admin` | — | Login (admin only) |
| GET | `/me` | ✅ Bearer | Get current user profile (dashboard alias) |
| GET | `/profile` | ✅ Bearer | Get current user profile |
| PUT | `/update-user` | ✅ Bearer | Update own profile |
| PUT | `/change-password` | ✅ Bearer | Change own password |
| POST | `/logout` | ✅ Bearer | Logout (stateless — client discards token) |
| POST | `/send-sms` | — | Send OTP to phone |
| POST | `/verify-sms` | — | Verify OTP and receive token |

---

### Restaurants (`/v1/restaurants`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | — | List active restaurants (search, cuisine, location, price, sort, page) |
| GET | `/addresses` | — | List cities with restaurant counts |
| GET | `/cuisines/list` | — | List cuisines with counts |
| GET | `/:id` | — | Restaurant detail |
| POST | `/` | 🔑 ADMIN | Create restaurant |
| POST | `/import` | 🔑 ADMIN | Bulk import from CSV/JSON file |
| PUT | `/:id` | 🔑 OWNER / ADMIN | Update restaurant |
| PATCH | `/:id/status` | 🔑 ADMIN | Update restaurant status |
| DELETE | `/all` | 🔑 ADMIN | Delete all restaurants |
| DELETE | `/:id` | 🔑 OWNER / ADMIN | Delete restaurant |
| GET | `/favorites/list` | ✅ Bearer | List favourited restaurants |
| POST | `/favorites/toggle` | ✅ Bearer | Toggle favourite |

**Query params for `GET /`:** `search`, `cuisine`, `location`, `date`, `priceRate` (`low`/`medium`/`high`), `sortBy` (`popular`/`rated`/`newest`), `guestCount`, `minCapacity`, `page`, `limit`

---

### Menus (`/v1/restaurants`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/:restaurantId/menus` | — | List menus |
| POST | `/:restaurantId/menus` | 🔑 OWNER / ADMIN | Create menu |
| PUT | `/:restaurantId/menus/:menuId` | 🔑 OWNER / ADMIN | Update menu |
| DELETE | `/:restaurantId/menus/:menuId` | 🔑 OWNER / ADMIN | Delete menu |
| GET | `/:restaurantId/menus/:menuId/items` | — | List menu items |
| POST | `/:restaurantId/menus/:menuId/items` | 🔑 OWNER / ADMIN | Add menu item |

---

### Bookings (`/v1/bookings`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/` | — / ✅ | Create booking (guest or authenticated customer) |
| GET | `/customer` | ✅ CUSTOMER | List own bookings |
| GET | `/customer/:id` | ✅ CUSTOMER | Get own booking detail |
| POST | `/customer/:id/cancel` | ✅ CUSTOMER | Cancel own booking |
| GET | `/restaurant/:restaurantId` | 🔑 OWNER / ADMIN | Bookings for a restaurant |
| POST | `/:id/accept` | 🔑 OWNER / ADMIN | Accept a booking |
| POST | `/:id/reject` | 🔑 OWNER / ADMIN | Reject a booking |
| POST | `/:id/complete` | 🔑 OWNER / ADMIN | Mark as completed / no-show |

---

### Admin Panel (`/v1/admin`)

> All routes require **ADMIN** role (`Authorization: Bearer <token>`).

#### Dashboard

| Method | Path | Description |
|--------|------|-------------|
| GET | `/dashboard/stats` | Aggregate stats: total users, restaurants, bookings, pending actions, recent bookings |

#### Users

| Method | Path | Description |
|--------|------|-------------|
| GET | `/users` | List all non-admin users — `?search`, `?role`, `?page`, `?limit` |
| GET | `/users/:id` | Get user by ID |
| POST | `/users` | Create user (any role) |
| PUT | `/users/:id` | Update user (name, email, phone, role) |
| DELETE | `/users/:id` | Delete user |
| PATCH | `/users/:id/status` | Set status: `active` / `inactive` / `suspended` |

**POST / PUT body:**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "secret123",
  "phone": "+855 12 345 678",
  "role": "owner"
}
```

#### Restaurants

| Method | Path | Description |
|--------|------|-------------|
| GET | `/restaurants` | List all restaurants — `?search`, `?status`, `?page`, `?limit` |
| PUT | `/restaurants/:id` | Update restaurant details |
| PATCH | `/restaurants/:id/status` | Set status: `active` / `inactive` / `pending` / `suspended` |
| DELETE | `/restaurants/:id` | Delete restaurant and related data |

#### Bookings

| Method | Path | Description |
|--------|------|-------------|
| GET | `/bookings` | List all bookings — `?search`, `?status`, `?page`, `?limit` |
| GET | `/bookings/:id` | Booking detail |
| PUT | `/bookings/:id` | Update booking (status, date, time, partySize) |
| DELETE | `/bookings/:id` | Delete booking |

#### Restaurant Requests

| Method | Path | Description |
|--------|------|-------------|
| GET | `/restaurant-requests` | List all slot requests — `?search`, `?status`, `?page`, `?limit` |
| PUT | `/restaurant-requests/:id/review` | Approve or reject a request |

**Review body:**
```json
{
  "status": "approved",
  "adminNote": "Approved — your limit has been increased to 5."
}
```

---

### Owner Panel (`/v1/owner`)

> All routes require **OWNER** role. All data is automatically scoped to the authenticated owner.

#### Dashboard

| Method | Path | Description |
|--------|------|-------------|
| GET | `/dashboard/stats` | Stats scoped to own restaurants: restaurant counts, booking counts, today's bookings, `canAddRestaurant` flag |

#### Restaurants

| Method | Path | Description |
|--------|------|-------------|
| GET | `/restaurants` | List own restaurants — `?search`, `?page`, `?limit` |
| GET | `/restaurants/:id` | Get own restaurant by ID |
| POST | `/restaurants` | Create restaurant (enforces slot limit; seeds operating hours) |
| PUT | `/restaurants/:id` | Update own restaurant |
| DELETE | `/restaurants/:id` | Delete own restaurant |

**POST body:**
```json
{
  "name": "My Bistro",
  "description": "Cozy French bistro",
  "address": "123 Main St",
  "city": "Phnom Penh",
  "phone": "+855 23 000 001",
  "email": "bistro@example.com",
  "cuisineType": "French",
  "capacity": 60,
  "openingTime": "11:00",
  "closingTime": "22:00"
}
```

> New restaurants start with status `pending` and require admin approval.

#### Bookings

| Method | Path | Description |
|--------|------|-------------|
| GET | `/bookings` | Bookings across all own restaurants — `?search`, `?status`, `?restaurantId`, `?page`, `?limit` |
| GET | `/bookings/:id` | Booking detail (ownership enforced) |
| PUT | `/bookings/:id` | Update booking status / details |

#### Restaurant Slot Requests

| Method | Path | Description |
|--------|------|-------------|
| GET | `/restaurant-requests` | List own requests with status history |
| POST | `/restaurant-requests` | Submit a new slot request |

**POST body:**
```json
{
  "requestedCount": 5,
  "reason": "We are expanding to two new cities and need additional slots for our growing chain."
}
```

> A new request is blocked if there is already a pending one.  
> `requestedCount` must be ≥ 4 (owners start with a default limit of 3).

---

## Database Models

| Model | Description |
|-------|-------------|
| `User` | Core account — email, password, role |
| `Customer` | Extended customer profile |
| `RestaurantOwner` | Extended owner profile + restaurant relations |
| `Admin` | Extended admin profile |
| `Restaurant` | Restaurant info, status, operating details |
| `RestaurantApproval` | Admin approval record per restaurant |
| `RestaurantRequest` | ★ Owner requests for additional restaurant slots |
| `Table` | Seating tables within a restaurant |
| `Booking` | Reservations with full status lifecycle |
| `BookingTable` | Booking ↔ Table join |
| `OperatingHour` | Weekly opening / closing times per restaurant |
| `SpecialClosure` | One-off closure dates |
| `Menu` | Menu collections per restaurant |
| `MenuItem` | Individual dishes / drinks |
| `Review` | Customer ratings and comments |
| `Payment` | Payment records per booking |
| `FavouriteRestaurant` | Customer favourites |
| `RestaurantImage` | Gallery images |
| `Tag` | Restaurant category tags |
| `Notification` | In-app user notifications |
| `RefreshToken` | JWT refresh token store |
| `AuditLog` | Admin action audit trail |

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | ✅ | — | MySQL connection string |
| `PORT` | — | `3001` | HTTP server port |
| `NODE_ENV` | — | `development` | Environment flag |
| `JWT_SECRET` | ✅ | `secret` | JWT signing key (use a strong value in prod) |
| `JWT_EXPIRES_IN` | — | `7d` | Token expiry |

---

## Common Scripts

```bash
npm run dev              # Start dev server with hot-reload (nodemon)
npm run build            # Compile TypeScript → JavaScript
npm start                # Start production server

npm run prisma:generate  # Regenerate Prisma client from schema
npm run prisma:migrate   # Apply pending migrations (dev)
npx prisma studio        # Open DB browser UI at localhost:5555
npx prisma migrate reset # ⚠ Drop and recreate DB (dev only)
```

---

## Troubleshooting

### `Error: connect ECONNREFUSED 127.0.0.1:3306`
MySQL is not running.
```bash
brew services start mysql   # macOS Homebrew
docker start mysql           # Docker
```

### `Cannot find module` / missing packages
```bash
npm install
```

### `DATABASE_URL is not set`
Create a `.env` file — see [Setup Guide](#3-create-env).

### `Cannot find name 'prisma'` / Prisma client missing
```bash
npm run prisma:generate
```

### Migration errors after schema changes
```bash
npx prisma migrate dev --name describe_your_change
```

### `Error: Restaurant limit reached`
The owner has reached their allowed restaurant count. They need to submit a request via `POST /api/v1/owner/restaurant-requests` and wait for admin approval.

### TypeScript compilation errors
```bash
npm install --save-dev @types/node @types/express
```

### Port already in use
```bash
PORT=3002 npm run dev
```

---

## Security Notes

- Never commit `.env` to Git — add it to `.gitignore`
- Use a long, random `JWT_SECRET` in production
- Enable HTTPS behind a reverse proxy (nginx / Caddy) in production
- All user input is validated with Zod schemas before reaching the database
- Keep dependencies audited: `npm audit fix`

---

## Further Reading

- [cURL Examples & Postman Guide](src/docs/API_CURL_EXAMPLES.md)
- [Booking API Docs](src/docs/BOOKING_API.md)
- [Restaurant API Docs](src/docs/RESTAURANT_API.md)
- [Menu API Docs](src/docs/MENU_API.md)
- [Express.js Docs](https://expressjs.com/)
- [Prisma Docs](https://www.prisma.io/docs/)
- [TypeScript Docs](https://www.typescriptlang.org/docs/)
- [Zod Docs](https://zod.dev/)
- [MySQL Docs](https://dev.mysql.com/doc/)

---

## License

ISC

---

*Happy coding! 🎉*
