# Aurelia Hotel — Hotel Management Platform

A full-stack hotel management platform with separate user and admin experiences.

- Frontend: React + Vite
- Backend: FastAPI + MySQL
- Database: MySQL schema and seed scripts included

## Included features

Guests can:
- Browse rooms with date, type, and max-price filters
- View room details with amenities and live pricing
- Register or sign in, then book rooms and track their bookings
- Cancel pending or confirmed bookings from My bookings

Admins can:
- View a dashboard with summary metrics
- Create, edit, and delete rooms
- Review bookings and update their status

## Project structure

```text
hotel-management/
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── .env.example
│   ├── database/
│   │   ├── schema.sql
│   │   └── seed.sql
│   └── scripts/
│       └── seed.py
└── frontend/
    ├── package.json
    ├── vite.config.ts
    ├── index.html
    └── src/
        ├── App.tsx
        ├── main.tsx
        ├── index.css
        ├── context/
        ├── lib/
        └── types.ts
```

## Setup

### 1. Database

Create the schema and seed data:

```bash
mysql -u root -p < backend/database/schema.sql
mysql -u root -p hotel_management < backend/database/seed.sql
```

### 2. Backend

Copy `backend/.env.example` to `backend/.env` and set your local database
credentials and a long, random `JWT_SECRET`. Do not commit `backend/.env`.

```bash
cd backend
python -m pip install -r requirements.txt
python scripts/seed.py
python -m uvicorn main:app --host 0.0.0.0 --port 4000
```

This creates the demo admin and guest accounts:
- admin@hotel.com / Admin123!
- asha@example.com / User123!

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend uses the API at http://localhost:4000/api. Update the base URL in the frontend API client if your backend runs elsewhere.

## Design notes

The layout keeps the same premium hospitality look as the original app:
- deep navy primary palette
- warm ivory backgrounds
- antique gold accents
- serif heading treatment with a quiet card-based layout

## Notes

- FastAPI handles the same REST endpoints as the previous API contract.
- JWT auth is still used for user sessions and admin-only routes.
- The React app preserves the same booking flow and admin screens with matched styling.
