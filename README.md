# Customer PCID Status Tracker

A full-stack web application for managing customer delivery and PCID status tracking.

## Tech Stack

### Backend
- **FastAPI** - Modern, fast web framework for building APIs
- **SQLModel** - Type-safe ORM with Pydantic integration
- **PostgreSQL** - Robust relational database
- **Pandas + OpenPyXL** - Excel file processing
- **Celery + Redis** - Background job processing for large imports
- **JWT Authentication** - Secure token-based auth

### Frontend
- **React 18 + TypeScript** - Type-safe UI development
- **Vite** - Fast build tool and dev server
- **TanStack Query** - Server state management
- **Zustand** - Lightweight client state management
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui inspired components** - Accessible, customizable UI

## Features

- **Dashboard** with summary statistics (Total, IP, Completed, HOLD)
- **CRUD Operations** - Create, Read, Update, Delete records
- **Search & Filter** - Search by Customer ID, PCID, Designer; Filter by Status
- **Excel Import/Export** - Bulk import from Excel, export filtered data
- **Pagination** - Configurable page size
- **Authentication** - JWT-based login/registration
- **Responsive Design** - Works on desktop and mobile

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for local frontend development)
- Python 3.11+ (for local backend development)

### Using Docker Compose (Recommended)

1. Clone and navigate to the project:
```bash
cd pcid-tracker
```

2. Create environment file:
```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your settings
```

3. Start all services:
```bash
docker-compose up -d
```

4. Access the application:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

### Local Development

#### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -e ".[dev]"
cp .env.example .env
# Edit .env with your settings
uvicorn app.main:app --reload
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Project Structure

```
pcid-tracker/
├── backend/
│   ├── app/
│   │   ├── api/          # API routes
│   │   ├── core/         # Config, security, database
│   │   ├── models/       # SQLModel models
│   │   ├── schemas/      # Pydantic schemas
│   │   ├── services/     # Business logic
│   │   └── tasks/        # Celery tasks
│   ├── alembic/          # Database migrations
│   └── tests/
├── frontend/
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── lib/          # Utilities
│   │   ├── services/     # API services
│   │   ├── store/        # Zustand stores
│   │   └── types/        # TypeScript types
│   └── public/
└── docker-compose.yml
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login (returns JWT)
- `GET /api/auth/me` - Get current user

### Records
- `GET /api/records` - List records (with pagination, search, filter)
- `GET /api/records/summary` - Get summary statistics
- `POST /api/records` - Create new record
- `GET /api/records/{id}` - Get single record
- `PATCH /api/records/{id}` - Update record
- `DELETE /api/records/{id}` - Delete record
- `DELETE /api/records` - Clear all records
- `POST /api/export` - Export records to Excel
- `POST /api/import` - Import records from Excel

## Excel Format

The import expects an Excel file with these columns:
- **Customer ID** (required)
- **PCID** (required)
- **Designer Name** (required)
- **Delivery Date** (optional, format: YYYY-MM-DD)
- **Status** (optional: IP, Completed, HOLD - defaults to IP)
- **Remarks** (optional)

## Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/pcid_tracker
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080
CORS_ORIGINS=["http://localhost:5173","http://localhost:3000"]
```

## License

MIT