# Hotel & Restaurant SaaS Platform

A full-stack hospitality management platform combining hotel and restaurant operations into a single unified system. Built with a modern tech stack supporting Web, Desktop, and Mobile clients.

## Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Flutter     │    │  React Web  │    │  Tauri       │
│  Mobile App  │    │  Admin      │    │  Desktop     │
└──────┬──────┘    └──────┬──────┘    └──────┬───────┘
       │                  │                  │
       └──────────┬───────┴──────────────────┘
                  │
          ┌───────▼────────┐
          │  Nginx Reverse  │
          │  Proxy (:80)    │
          └───────┬────────┘
                  │
          ┌───────▼────────┐
          │  Express.js     │
          │  API (:3000)    │
          └───────┬────────┘
                  │
          ┌───────▼────────┐
          │  PostgreSQL     │
          │  Database       │
          └────────────────┘
```

## Tech Stack

| Layer     | Technology                                    |
|-----------|-----------------------------------------------|
| Backend   | Node.js, Express.js, Sequelize ORM, PostgreSQL|
| Web Admin | React 18, Vite, Tailwind CSS, Recharts        |
| Desktop   | Tauri 2 (Rust), SQLite offline, system tray   |
| Mobile    | Flutter 3.2+, Riverpod, GoRouter, Dio         |
| Infra     | Docker Compose, Nginx, PostgreSQL 15          |

## Quick Start (Docker)

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) & Docker Compose installed
- Ports **80** and **5432** available

### 1. Clone & Start

```bash
cd hotelRestuarant
docker compose up --build
```

This will:
- Start PostgreSQL 15 database
- Build & start the Express.js API server
- Build the React web admin (multi-stage)
- Start Nginx reverse proxy serving everything on port **80**
- Auto-seed the database with sample data

### 2. Access the Application

| Service     | URL                          |
|-------------|------------------------------|
| Web Admin   | http://localhost              |
| API Health  | http://localhost/api/health   |

### 3. Login Credentials

| Field    | Value              |
|----------|--------------------|
| Email    | admin@hotel.com    |
| Password | admin123           |

## Features

### Hotel Management
- **Room Management** — CRUD operations, room types (standard/deluxe/suite/penthouse), floor assignment, pricing, status tracking
- **Reservations** — Create/manage bookings, check-in/check-out workflow, status transitions (confirmed → checked_in → checked_out)
- **Guest Management** — Guest profiles, VIP status tracking, contact information, stay history

### Restaurant Management
- **Menu Management** — Categories and items with pricing, availability toggle
- **Table Management** — Table layout, capacity, real-time status (available/occupied/reserved)
- **Order System** — Create orders, add items, status workflow (pending → preparing → ready → served → completed)

### Billing & Reports
- **Invoice Generation** — Auto-calculate from reservations/orders, tax computation, payment tracking
- **Dashboard** — Real-time stats, occupancy rate, revenue charts, recent activity

### Desktop Features (Tauri)
- Offline mode with local SQLite database
- Print invoices and receipts
- Keyboard shortcuts
- System tray with notifications
- Local database backup

### Mobile Features (Flutter)
- Bottom navigation with 5 main sections
- Room status grid view
- Order management
- Guest search
- Push notification support

## Project Structure

```
hotelRestuarant/
├── docker-compose.yml        # Service orchestration
├── Dockerfile.nginx           # Multi-stage: build React + serve via Nginx
├── .env                       # Environment variables
├── nginx/
│   └── nginx.conf             # Reverse proxy configuration
├── backend/
│   ├── Dockerfile             # Node.js API container
│   ├── package.json
│   └── src/
│       ├── index.js           # Express app entry point
│       ├── config/
│       │   └── database.js    # Sequelize/PostgreSQL config
│       ├── models/            # 9 Sequelize models
│       ├── routes/            # 8 API route modules
│       ├── middleware/        # Auth & error handling
│       └── seeders/           # Database seed data
├── web-admin/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx            # Route definitions
│       ├── api/               # Axios instance
│       ├── context/           # Auth context
│       ├── components/        # Reusable UI components
│       └── pages/             # 9 page components
├── desktop/
│   ├── package.json
│   └── src-tauri/
│       ├── Cargo.toml
│       ├── tauri.conf.json
│       └── src/               # Rust backend commands
└── mobile/
    ├── pubspec.yaml
    └── lib/
        ├── main.dart
        ├── services/          # API & auth services
        └── screens/           # 7 screen widgets
```

## API Endpoints

### Authentication
| Method | Endpoint          | Description        |
|--------|-------------------|--------------------|
| POST   | /api/auth/login   | User login         |
| POST   | /api/auth/register| Register new user  |
| GET    | /api/auth/me      | Get current user   |

### Rooms
| Method | Endpoint           | Description        |
|--------|--------------------|--------------------|
| GET    | /api/rooms         | List all rooms     |
| POST   | /api/rooms         | Create room        |
| PUT    | /api/rooms/:id     | Update room        |
| DELETE | /api/rooms/:id     | Delete room        |

### Reservations
| Method | Endpoint                        | Description          |
|--------|---------------------------------|----------------------|
| GET    | /api/reservations               | List reservations    |
| POST   | /api/reservations               | Create reservation   |
| PUT    | /api/reservations/:id           | Update reservation   |
| PUT    | /api/reservations/:id/checkin   | Check-in guest       |
| PUT    | /api/reservations/:id/checkout  | Check-out guest      |
| PUT    | /api/reservations/:id/cancel    | Cancel reservation   |

### Guests
| Method | Endpoint           | Description        |
|--------|--------------------|--------------------|
| GET    | /api/guests        | List all guests    |
| POST   | /api/guests        | Create guest       |
| PUT    | /api/guests/:id    | Update guest       |
| DELETE | /api/guests/:id    | Delete guest       |

### Restaurant
| Method | Endpoint                      | Description          |
|--------|-------------------------------|----------------------|
| GET    | /api/restaurant/categories    | List categories      |
| POST   | /api/restaurant/categories    | Create category      |
| GET    | /api/restaurant/menu          | List menu items      |
| POST   | /api/restaurant/menu          | Create menu item     |
| PUT    | /api/restaurant/menu/:id      | Update menu item     |
| GET    | /api/restaurant/tables        | List tables          |
| POST   | /api/restaurant/tables        | Create table         |
| PUT    | /api/restaurant/tables/:id    | Update table         |

### Orders
| Method | Endpoint                   | Description          |
|--------|----------------------------|----------------------|
| GET    | /api/orders                | List orders          |
| POST   | /api/orders                | Create order         |
| PUT    | /api/orders/:id/status     | Update order status  |
| POST   | /api/orders/:id/items      | Add items to order   |

### Invoices
| Method | Endpoint                   | Description          |
|--------|----------------------------|----------------------|
| GET    | /api/invoices              | List invoices        |
| POST   | /api/invoices              | Create invoice       |
| PUT    | /api/invoices/:id/pay      | Mark invoice paid    |

### Dashboard
| Method | Endpoint                   | Description          |
|--------|----------------------------|----------------------|
| GET    | /api/dashboard/stats       | Get dashboard stats  |

## Environment Variables

| Variable      | Default           | Description              |
|---------------|-------------------|--------------------------|
| DB_HOST       | db                | PostgreSQL host          |
| DB_PORT       | 5432              | PostgreSQL port          |
| DB_NAME       | hotelrestaurant   | Database name            |
| DB_USER       | postgres          | Database user            |
| DB_PASSWORD   | postgres123       | Database password        |
| JWT_SECRET    | (auto-generated)  | JWT signing secret       |
| NODE_ENV      | production        | Node environment         |
| APP_PORT      | 80                | Nginx exposed port       |

## Development

### Backend Only
```bash
cd backend
npm install
npm run dev
```

### Web Admin Only
```bash
cd web-admin
npm install
npm run dev
```

### Flutter Mobile
```bash
cd mobile
flutter pub get
flutter run
```

### Desktop (Tauri)
```bash
cd desktop
npm install
npm run tauri dev
```

## Freemium Model

| Feature              | Free       | Premium    |
|----------------------|------------|------------|
| Rooms                | Up to 20   | Unlimited  |
| Menu Items           | Up to 50   | Unlimited  |
| Staff Accounts       | 2          | Unlimited  |
| Reports              | Basic      | Advanced   |
| Desktop App          | ✗          | ✓          |
| Priority Support     | ✗          | ✓          |
| Custom Branding      | ✗          | ✓          |

## License

MIT
