# TableSite - Restaurant Table Booking API

A comprehensive Node.js/Express API for restaurant table management, bookings, and reservations. Built with TypeScript, Prisma ORM, and MySQL.

## Table of Contents

- [Project Overview](#project-overview)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Setup Guide](#setup-guide)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Environment Variables](#environment-variables)
- [Troubleshooting](#troubleshooting)

---

## Project Overview

TableSite is a full-featured restaurant management API that enables:

- **Authentication & Authorization** - User roles (Customer, Owner, Admin)
- **Restaurant Management** - Create, update, and manage restaurants
- **Table Management** - Manage tables and seating arrangements
- **Booking System** - Handle reservations with status tracking
- **Menu Management** - Organize menus and menu items
- **Reviews & Ratings** - Customer feedback and ratings
- **Payment Processing** - Track payments and deposits
- **Admin Controls** - Restaurant approval and audit logs

---

## Tech Stack

- **Runtime**: Node.js (v18+)
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: MySQL
- **ORM**: Prisma
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcrypt
- **Validation**: Zod
- **Security**: Helmet, CORS
- **Logging**: Morgan
- **Development**: Nodemon

---

## Prerequisites

Before starting, ensure you have installed:

1. **Node.js** (v18 or higher)
   - Download from [nodejs.org](https://nodejs.org/)
   - Verify: `node --version` and `npm --version`

2. **MySQL** (v8.0 or higher)
   - Download from [mysql.com](https://dev.mysql.com/downloads/mysql/)
   - Or use Docker: `docker run --name mysql -e MYSQL_ROOT_PASSWORD=root -p 3306:3306 -d mysql:8.0`

3. **Git** (optional, for cloning)
   - Download from [git-scm.com](https://git-scm.com/)

---

## Setup Guide

### Step 1: Clone or Navigate to Project

```bash
# If cloning:
git clone <repository-url>
cd TableSite

# Or navigate to existing project:
cd /path/to/TableSite
```

### Step 2: Install Dependencies

Install all required npm packages:

```bash
npm install
```

This installs both production and development dependencies defined in `package.json`.

### Step 3: Create Environment Configuration

Create a `.env` file in the root directory:

```bash
touch .env
```

Add the following environment variables to `.env`:

```env
# Database Connection
DATABASE_URL="mysql://root:password@localhost:3306/tablesite_db"

# Server Configuration
PORT=3000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRY=7d

# Email Configuration (Optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
EMAIL_FROM=noreply@tablesite.com
```

**Note**: Replace `password`, `JWT_SECRET`, and email credentials with your actual values.

### Step 4: Create Database

Create the MySQL database:

```bash
mysql -u root -p
```

Then run in MySQL:

```sql
CREATE DATABASE tablesite_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

### Step 5: Generate Prisma Client

Generate the Prisma Client based on your schema:

```bash
npm run prisma:generate
```

or

```bash
npx prisma generate
```

### Step 6: Run Database Migrations

Apply all pending database migrations:

```bash
npm run prisma:migrate
```

or

```bash
npx prisma migrate dev
```

This command will:

- Create all database tables
- Set up relationships
- Seed any initial data (if configured)

### Step 7: Build TypeScript

Compile TypeScript to JavaScript:

```bash
npm run build
```

### Step 8: Start the API Server

Start the development server with hot-reload:

```bash
npm run dev
```

**Success!** You should see:

```
API running on http://localhost:3000
```

---

## Verify the Setup

### Check API Health

Open your browser or use curl to test the API:

```bash
curl http://localhost:3000/api/v1/auth
```

Or use Postman/Insomnia to test the endpoints.

### View Database in Prisma Studio

Open an interactive browser GUI to view your database:

```bash
npx prisma studio
```

This opens at `http://localhost:5555`

---

## Project Structure

```
TableSite/
├── src/
│   ├── controllers/          # Request handlers for routes
│   │   ├── auth.controller.ts
│   │   ├── menu.controller.ts
│   │   └── restaurant.controller.ts
│   ├── routes/               # API route definitions
│   │   ├── auth.route.ts
│   │   ├── menu.route.ts
│   │   ├── restaurant.route.ts
│   │   └── index.ts
│   ├── middlewares/          # Express middleware
│   │   ├── auth.middleware.ts
│   │   ├── error.middleware.ts
│   │   └── notFound.middleware.ts
│   ├── schemas/              # Zod validation schemas
│   │   ├── auth.schema.ts
│   │   ├── menu.schema.ts
│   │   └── restaurant.schema.ts
│   ├── types/                # TypeScript type definitions
│   │   └── express.d.ts
│   ├── util/                 # Utility functions
│   │   ├── helper.ts
│   │   ├── index.util.ts
│   │   └── prisma.ts
│   ├── errors/               # Custom error classes
│   │   └── AppError.ts
│   ├── constants/            # Constants and configuration
│   │   └── index.constants.ts
│   ├── docs/                 # API documentation
│   │   ├── MENU_API.md
│   │   ├── RESTAURANT_API.md
│   │   └── examples/
│   ├── app.ts                # Express app setup
│   └── index.ts              # Server entry point
├── prisma/
│   ├── schema.prisma         # Database schema definition
│   └── migrations/           # Database migration history
├── generated/
│   └── prisma/               # Generated Prisma Client
├── .env                      # Environment variables (create this)
├── tsconfig.json             # TypeScript configuration
├── package.json              # Dependencies and scripts
├── nodemon.json              # Nodemon configuration
└── README.md                 # This file
```

---

## API Documentation

The API is organized in the following versions and endpoints:

### Base URL

```
http://localhost:3000/api
```

### Main Endpoints

#### Authentication Routes (`/v1/auth`)

- `POST /register` - Register new user
- `POST /login` - User login
- `POST /refresh-token` - Refresh access token
- `POST /logout` - Logout user

#### Restaurant Routes (`/v1/restaurants`)

- `GET /` - List all restaurants
- `GET /:id` - Get restaurant details
- `POST /` - Create new restaurant (Owner)
- `PUT /:id` - Update restaurant (Owner)
- `DELETE /:id` - Delete restaurant (Owner/Admin)
- `GET /:id/tables` - Get restaurant tables
- `GET /:id/menus` - Get restaurant menus

#### Menu Routes (`/v1/restaurants`)

- `POST /:restaurantId/menus` - Create menu
- `GET /:restaurantId/menus` - List menus
- `PUT /:restaurantId/menus/:menuId` - Update menu
- `DELETE /:restaurantId/menus/:menuId` - Delete menu
- `POST /:restaurantId/menus/:menuId/items` - Add menu item
- `GET /:restaurantId/menus/:menuId/items` - List menu items

For detailed API documentation, see:

- [Menu API Documentation](src/docs/MENU_API.md)
- [Restaurant API Documentation](src/docs/RESTAURANT_API.md)

---

## Environment Variables

### Required Variables

| Variable       | Description                          | Default       |
| -------------- | ------------------------------------ | ------------- |
| `DATABASE_URL` | MySQL connection string              | Required      |
| `PORT`         | Server port                          | `3000`        |
| `NODE_ENV`     | Environment (development/production) | `development` |
| `JWT_SECRET`   | Secret key for JWT signing           | Required      |

---

## Common npm Scripts

```bash
# Start development server with hot-reload
npm run dev

# Build TypeScript to JavaScript
npm run build

# Start production server
npm start

# Generate Prisma Client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Open Prisma Studio UI
npx prisma studio
```

---

## Database Models

The application includes the following main database models:

- **User** - User accounts with roles
- **Customer** - Customer profiles
- **RestaurantOwner** - Restaurant owner profiles
- **Admin** - Admin user profiles
- **Restaurant** - Restaurant information
- **Table** - Restaurant seating tables
- **Menu** - Menu collections
- **MenuItem** - Individual menu items
- **Booking** - Table reservations
- **Review** - Customer reviews and ratings
- **Payment** - Payment transactions
- **OperatingHour** - Restaurant operating hours
- **SpecialClosure** - Special closure dates
- **Amenity** - Restaurant amenities
- **RestaurantAmenity** - Restaurant-amenity associations
- **RestaurantTag** - Restaurant categorization tags
- **RestaurantImage** - Restaurant gallery images
- **Notification** - User notifications
- **RefreshToken** - JWT refresh tokens
- **AuditLog** - Admin action logs

---

## Troubleshooting

### Issue: `Cannot find module 'dotenv'`

**Solution**: Run `npm install` to install dependencies.

### Issue: `DATABASE_URL is not set`

**Solution**: Create a `.env` file with `DATABASE_URL` variable.

### Issue: `Error: connect ECONNREFUSED 127.0.0.1:3306`

**Solution**: Ensure MySQL is running:

```bash
# macOS with Homebrew
brew services start mysql

# Docker
docker run --name mysql -e MYSQL_ROOT_PASSWORD=root -p 3306:3306 -d mysql:8.0

# Or start if container exists
docker start mysql
```

### Issue: `Cannot find name 'prisma'`

**Solution**: Run `npm run prisma:generate` to generate Prisma Client.

### Issue: Database migration errors

**Solution**: Reset the database (warning: deletes all data):

```bash
npx prisma migrate reset
```

### Issue: Port 3000 already in use

**Solution**: Use a different port:

```bash
PORT=3001 npm run dev
```

### Issue: TypeScript compilation errors

**Solution**: Install TypeScript types:

```bash
npm install --save-dev @types/node @types/express
```

---

## Development Workflow

1. **Make code changes** in `src/` directory
2. **Nodemon automatically restarts** the server
3. **Test changes** using Postman/Insomnia or curl
4. **Check database** with `npx prisma studio`
5. **Commit changes** to Git

---

## Security Notes

- Keep `.env` file private and **never commit** to Git
- Use strong JWT secret in production
- Use HTTPS in production
- Validate all user inputs (Zod schemas in place)
- Keep dependencies updated: `npm audit` and `npm update`

---

## Support & Documentation

For more details, refer to:
restarts**the server 3. **Test changes** using Postman/Insomnia or curl 4. **Check database** with `npx prisma studio` 5.**Commit changes\*\* to Git

---

## Security Notes

- Keep `.env` file private and **never commit** to Git
- Use strong JWT secret in production
- Use HTTPS in production
- Validate all user inputs (Zod schemas in place)
- Keep dependencies updated: `npm audit` and `npm update`

---

## Support & Documentation

For more details, refer to:

- [Express.js Documentation](https://expressjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [MySQL Documentation](https://dev.mysql.com/doc/)

---

## License

ISC

---

**Happy coding! 🎉**
