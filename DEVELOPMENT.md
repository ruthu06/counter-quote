# Working in this project

A .NET API with a SQLite database, and a React + TypeScript frontend. The task is in `README.md`.

## Where things are

```
backend/CounterQuote.Api/
  Models/        what is stored; one class per table
  Data/          AppDbContext: one DbSet per table
  Migrations/    generated database changes; don't edit by hand
  Controllers/   the API; returns the models directly
  Program.cs     startup; applies migrations, adds two sample jobs
backend/CounterQuote.Api.Tests/   xUnit tests on an in-memory SQLite database
frontend/src/
  api.ts         types and calls to the API
  pages/         one file per screen
  main.tsx       routes
data/app.db      the database, created on first run
```

The web app runs on port 5173 and the API on 5080. Vite sends `/api` to the API. Try API calls at http://localhost:5080/swagger.

## Commands

| Task | Where | Command |
|---|---|---|
| Run the API | `backend/CounterQuote.Api` | `dotnet run` |
| Run the web app | `frontend` | `npm install`, then `npm run dev` |
| Run the tests | `backend` | `dotnet test` |
| Check the frontend | `frontend` | `npm run build` |
| Change the database | `backend/CounterQuote.Api` | `dotnet tool restore`, then `dotnet ef migrations add <Name>` |

With Docker instead, from the project folder: `docker compose up --build`, `docker compose run --rm api dotnet test ..`, `docker compose run --rm api dotnet ef migrations add <Name>`, `docker compose restart api`. Changes in `frontend/src` show up by themselves. After adding an npm package, run `docker compose up --build` again.

## Changing what gets saved

The database is SQLite, in `data/app.db`. To add a field:

1. Add the property to the class in `Models/`. A required field needs a default value, so existing rows stay valid.
2. Create a migration.
   - Without Docker: stop the API (Windows locks its files while it runs), then from `backend/CounterQuote.Api` run `dotnet tool restore` and `dotnet ef migrations add <Name>`.
   - With Docker: from the project folder run `docker compose run --rm api dotnet ef migrations add <Name>`. No need to stop it.
3. Add the field to the type in `frontend/src/api.ts`, then use it in the screen.
4. Run the tests. They fail if a model change has no migration.
5. Start the API again (`docker compose restart api` with Docker). It applies the migration and keeps saved data.

For a new table: add a class in `Models/`, add a `DbSet` in `Data/AppDbContext.cs`, then do the same. `JobsController` handles only the job itself, so related tables need changes there:

- Reading: replace `FindAsync` with a query that uses `.Include(...)`.
- Updating: `SetValues` skips lists, so add, change and remove the related rows yourself.
- In the related class, keep `JobId` and leave out a `Job` property, which would make the JSON loop.

`PUT` replaces the whole job, so send every field.

Never change the database structure by hand; always use a migration.

To look at the data, open `data/app.db` in DB Browser for SQLite (https://sqlitebrowser.org). To start over, stop the app and delete every file in `data` that starts with `app.db`.
