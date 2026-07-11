# Portfolio Tracker Server

Express + PostgreSQL backend for the Portfolio Tracker App.

## Quick start (existing PostgreSQL)

If you already have PostgreSQL installed:

1. **Verify it’s running**
   ```bash
   # macOS (Homebrew)
   brew services list | grep postgres

   # Or try connecting (default user is often your macOS username)
   psql -U postgres -h localhost -p 5432 -c "SELECT 1"
   ```
   If the connection fails, start the service (e.g. `brew services start postgresql@16`).

2. **Create the database**
   ```bash
   psql -U postgres -h localhost
   # or: psql postgres
   ```
   In the `psql` prompt:
   ```sql
   CREATE DATABASE portfolio;
   \q
   ```

3. **Point the server at your Postgres**
   ```bash
   cd server
   npm run prepare-env   # creates .env from .env.example if missing
   ```
   Edit `server/.env` and set `DATABASE_URL`:
   - Default local (no password): `DATABASE_URL=postgresql://localhost:5432/portfolio`
   - User postgres with password: `DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/portfolio`
   - Custom user: `DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/portfolio`

4. **Create tables and run the API**
   ```bash
   npm install
   npm run init-db
   npm run test-connection   # should print "PostgreSQL connected successfully."
   npm run dev
   ```
   Server runs at http://localhost:3001.

5. **Frontend**  
   In the project root `.env` add:
   ```
   VITE_API_URL=http://localhost:3001
   ```

---

## Alternative: PostgreSQL via Docker

If you don’t have PostgreSQL installed:

1. **Start PostgreSQL**
   ```bash
   cd server
   npm run db:up
   ```

2. **Create `.env` and tables**
   ```bash
   npm install
   npm run setup
   ```
   Uses default `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/portfolio`.

3. **Check and run**
   ```bash
   npm run test-connection
   npm run dev
   ```

---

## Scripts

| Command | Description |
|--------|-------------|
| `npm run db:up` | Start PostgreSQL (Docker) |
| `npm run db:down` | Stop PostgreSQL |
| `npm run prepare-env` | Copy `.env.example` → `.env` if `.env` doesn’t exist |
| `npm run setup` | prepare-env + init-db |
| `npm run test-connection` | Test DB connection |
| `npm run init-db` | Create/update DB tables |
| `npm run dev` | Run API with watch |

**Upgrading (Commodity asset type):** If you already have a database and want to support the "Commodity" asset type, run:
`ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_asset_type_check; ALTER TABLE transactions ADD CONSTRAINT transactions_asset_type_check CHECK (asset_type IN ('Stock', 'Crypto', 'Commodity'));`

## API Endpoints

- `GET /api/health` - Health check
- `GET /api/transactions` - List transactions
- `POST /api/transactions` - Create transaction
- `PATCH /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction
- `POST /api/historical-prices/fetch` - Body: `{ requests: [...] }`
- `POST /api/historical-prices/store` - Body: `{ prices: [...] }`
