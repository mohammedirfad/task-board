# Taskflow Task Board

A full stack task planning board implemented from the supplied assignment. The UI is Angular 22 with Angular CDK drag and drop. The API is Express 5 on Node.js. MySQL stores accounts, planning limits, and tasks.

## What is included

- JWT login and logout, route guards, an HTTP auth interceptor, and expired-session handling.
- Server-side JWT revocation on logout, so a copied token cannot be reused after sign-out.
- A dashboard with task totals and planned workload snapshot.
- Task create, view, edit, and confirmed delete.
- A four-stage Kanban board with drag-and-drop status persistence and capacity rejection rollback.
- A task table with title search, priority/status filters, safe sorting, and pagination.
- Daily/weekly planning limit settings.
- MySQL schema export, Swagger UI, OpenAPI JSON, and a Postman collection.
- Responsive layouts, form validation, loading states, toast notices, not-found and global error pages.

## Requirements

- Node.js **24.15 or newer** (Angular 22 supported runtime), plus npm.
- Docker Desktop with Compose, or a locally installed MySQL 8.0+ server.
- Ports 3306 (MySQL), 3000 (API), and 4200 (Angular dev server) available.

## Start from a fresh checkout (Windows PowerShell)

Run commands from this repository folder.

1. Start MySQL with Docker Compose:

   ```powershell
   docker compose up -d mysql
   docker compose ps
   ```

   The first start creates the `taskboard` schema and imports `database/taskboard.sql`. Compose persists data in the `taskboard_mysql` volume.

2. Create the API environment file:

   ```powershell
   Copy-Item server/.env.example server/.env
   ```

   The example values match the local Compose database. For an existing MySQL server, change `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD` in `server/.env`. Set `JWT_SECRET` to a fresh random string of at least 32 characters before deployment. Do not commit `.env` files.

3. Install workspace dependencies:

   ```powershell
   npm.cmd install
   ```

4. Start both applications in development mode:

   ```powershell
   npm.cmd run dev
   ```

   The API waits for MySQL, creates any missing tables, inserts default planning limits (8 daily / 40 weekly), then creates the local demo user if it does not already exist. Angular opens at `http://localhost:4200`; the API is at `http://localhost:3000`.

5. Sign in with the assignment credentials:

   - Email: `admin@test.com`
   - Password: `Admin@123`

   Those credentials are local-development-only. In production, set a unique administrator email and a randomly generated password, then run `npm.cmd run seed:admin --workspace server` once. Production mode deliberately does not create the demo account on startup.

6. Explore API documentation at `http://localhost:3000/api-docs` or raw OpenAPI JSON at `http://localhost:3000/openapi.json`. Import `postman/Task Board API.postman_collection.json` into Postman, call **Login** first, then use the protected requests. The Login test script stores the JWT for the collection.

### Local MySQL instead of Docker

For a full MySQL 8.4 install, service configuration, schema import, app-user setup, and troubleshooting guide, see [MySQL setup on Windows](docs/MYSQL-SETUP-WINDOWS.md).

Create a database and application account in MySQL, then import the export:

```sql
CREATE DATABASE taskboard CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER 'taskboard_app'@'127.0.0.1' IDENTIFIED BY 'choose-a-local-password';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, INDEX ON taskboard.* TO 'taskboard_app'@'127.0.0.1';
```

Import the schema in PowerShell (adjust the executable path if MySQL is not on `PATH`):

```powershell
cmd.exe /c "mysql -u root -p taskboard < database\taskboard.sql"
```

Set matching values in `server/.env` (including the new password and `DB_HOST=127.0.0.1`). The API also runs idempotent `CREATE TABLE IF NOT EXISTS` statements at start, so importing the SQL and starting the API is safe.

## How to use the application

1. **Overview** shows the number of tasks in each status, total story points, a capacity snapshot, and recently planned tasks.
2. **Kanban board** shows Backlog, Planned, In Progress, and Completed. Drag a card between columns. The card changes locally immediately; the API persists it. If capacity rejects the move, the previous status is restored and the API message appears in a toast.
3. **All tasks** provides search, priority and status filters, sortable columns, page-size selection, pagination, create/edit dialogs, and a delete confirmation.
4. **Planning settings** configures positive daily and weekly story point limits. The daily value cannot exceed the weekly value, and new limits cannot be lowered below work already planned.
5. **Sign out** revokes the JWT on the server, then immediately removes the local token and user profile. Visiting a protected route while signed out takes the user to Login. An expired or invalid JWT is also removed after the API returns 401.

### Capacity rules

- Task story points must be whole numbers of at least 1. Priority, title, planned date, and due date are required. Due date must be the planned date or later.
- Existing database migration checks old story-point values first. If it finds fractional values, API startup stops and reports that they need an explicit whole-number conversion; it does not silently round task data.
- Every task create/update calculates current daily and weekly planned usage and remaining capacity for the task dates. Only tasks whose resulting status is **Planned** reserve capacity; a task entering Planned must fit both remaining limits. Backlog work does not reserve capacity before it is planned.
- The task being edited is excluded from the existing-work sum, so changing its points or date does not count it twice.
- The API checks planned capacity inside a transaction and locks the single settings row. Create/update responses include the post-operation capacity snapshot; rejected Planned tasks return HTTP 409 with usage, limits, remaining points, and a readable message.
- Work can move freely among Planned, In Progress, and Completed. Completed tasks cannot move back to Backlog. Backlog-to-Planned movement is capacity-checked.

## API reference

All routes except `POST /login`, `GET /health`, `/api-docs`, and `/openapi.json` require `Authorization: Bearer <JWT>`. In browser requests the Angular dev proxy maps `/api/*` to the API and strips the `/api` prefix.

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/login` | Validate credentials and return JWT plus user profile |
| `POST` | `/logout` | Revoke the current JWT until its expiry |
| `GET` | `/dashboard` | Summary counts and total story points |
| `GET` | `/tasks` | Search/filter/sort/page tasks (`search`, `priority`, `status`, `sortBy`, `order`, `page`, `limit`) |
| `GET` | `/tasks/:id` | Read one task |
| `POST` | `/tasks` | Create task; enforces validation and planned capacity |
| `PUT` | `/tasks/:id` | Update task or its status; enforces capacity and status rules |
| `DELETE` | `/tasks/:id` | Delete task |
| `GET` | `/settings` | Read daily and weekly limits |
| `PUT` | `/settings` | Save positive daily and weekly limits |

Successful reads/writes use `{ "data": ... }`; list responses also include `{ "pagination": { "page", "limit", "total", "totalPages" } }`. Errors use `{ "error": { "code", "message", "details?", "requestId" } }`. API input validation is documented in Swagger and returns field-level details.

## Build and deployment notes

- Production frontend build: `npm.cmd run build` (Angular output under `client/dist/taskboard/browser`).
- Production API: set `NODE_ENV=production`, a strong `JWT_SECRET`, a strong admin password, database connection variables, and the trusted frontend `CLIENT_ORIGIN`; run `npm.cmd start` from the repository root. Configure the TLS-terminating reverse proxy to forward `/api/*` to Express while stripping the `/api` prefix, serve Angular's `index.html` for client-side routes, and expose only HTTPS publicly.
- Seed the first production admin by setting `DEMO_EMAIL` and `DEMO_PASSWORD` in the server environment, then running `npm.cmd run seed:admin --workspace server`; the seed command refuses to overwrite an existing account.
- Keep MySQL private to the application network, use a least-privilege database account, rotate credentials, and back up the database/volume.
- The assignment explicitly asks for the JWT in Local Storage. This implementation follows that requirement, but browser storage is readable by injected JavaScript. Keep Angular dependencies patched, avoid unsafe HTML/DOM APIs, set a restrictive Content Security Policy on the production static host, and use HTTPS. A hardened deployment that can change the client contract should move the session to an HttpOnly, Secure, SameSite cookie.

## Project map and request lifecycle

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for a file-by-file folder guide, startup sequence, login/interceptor flow, task persistence sequence, capacity algorithm, and production operations notes.

For the explanation round, see the [interview preparation guide](docs/INTERVIEW-PREPARATION.md) for a feature inventory, Windows setup commands, request-flow walkthroughs, security explanations, likely questions and sample answers, and suggested change exercises. A printable copy is available at `output/pdf/taskflow-interview-guide.pdf`.

To practice rebuilding the app independently in a new folder, follow [Rebuild Taskflow From Scratch](docs/REBUILD-FROM-SCRATCH.md), which gives the scaffold commands, file order, folder responsibilities, implementation sequence, run commands, and explanation outline.

Download the [Windows setup and run guide (PDF)](output/pdf/taskflow-setup-guide.pdf) for the commands in a printable checklist.

## Assignment deliverables

- Angular source: `client/`
- Node.js / Express source: `server/`
- MySQL export: `database/taskboard.sql`
- Setup and usage: this README
- Postman collection: `postman/Task Board API.postman_collection.json`
- Interactive API docs: `/api-docs`
