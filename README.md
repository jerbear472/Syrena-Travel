# Syrena Travel - Social Travel Map Platform

A platform that allows users to see their friends' saved places on a map and potentially access priority reservations.

## Architecture Overview

- **Frontend**: Next.js 15 with TypeScript and Tailwind CSS
- **Backend**: Node.js/Express with TypeScript
- **Database**: PostgreSQL with PostGIS for geospatial data
- **Maps**: Google Maps API integration
- **Authentication**: JWT-based authentication

## Project Structure

```
syrena-travel/
├── web/               # Next.js frontend application
├── api/               # Express backend API
└── start-dev.sh       # Development startup script
```

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+ with PostGIS extension
- Google Maps API Key (optional for map functionality)

## Setup Instructions

### 1. Database Setup

First, ensure PostgreSQL is installed and running. Create the database:

```bash
createdb syrena_travel
```

Then connect to the database and enable PostGIS:
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

### 2. Environment Configuration

Update the API environment file at `api/.env`:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=syrena_travel
DB_USER=your_postgres_user
DB_PASSWORD=your_postgres_password
JWT_SECRET=your-secret-key-here
GOOGLE_MAPS_API_KEY=your-google-maps-key
```

### 3. Install Dependencies

```bash
# Install backend dependencies
cd api
npm install

# Install frontend dependencies
cd ../web
npm install
```

### 4. Start Development Servers

From the project root:
```bash
./start-dev.sh
```

This will start:
- Frontend at http://localhost:3000
- Backend API at http://localhost:5000

## Available API Endpoints

- `GET /health` - Health check
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/users/profile` - Get user profile (auth required)
- `GET /api/places` - Get user's saved places (auth required)
- `POST /api/places` - Save new place (auth required)
- `GET /api/friends` - Get friends list (auth required)

## Features

### Current
- Modern responsive UI with map view
- Sidebar with categories and search
- Authentication system with JWT
- Database schema with PostGIS support
- Mock data for demonstration

### Planned
- Real-time friend activity feed
- Place recommendations algorithm
- Priority reservation system
- Social sharing features
- Mobile app (React Native)

## Development

### Backend Development
```bash
cd api
npm run dev    # Start with hot reload
npm run build  # Build for production
npm start      # Start production server
```

### Frontend Development
```bash
cd web
npm run dev    # Start development server
npm run build  # Build for production
npm start      # Start production server
```

## Tech Stack Details

### Frontend
- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- React Google Maps API
- Lucide React Icons
- Axios for API calls

### Backend
- Express.js
- TypeScript
- PostgreSQL with PostGIS
- JWT authentication
- bcrypt for password hashing
- CORS enabled

## License

MIT