# Testing Guide

This repository uses Node's built-in test runner.

## Run the suite

```bash
npm test
```

## What is covered

- `test/database.test.js` runs `setupDatabase.js` against a temporary PostgreSQL database and verifies that the expected tables are created.
- `test/http.test.js` boots the Express middleware layer and checks the `/health` endpoint plus the 404 response.
- `test/service.test.js` exercises the auth, cart, order, and user services against an in-memory mocked data layer so the query flows are covered without needing a live app server.

## Environment notes

- PostgreSQL must be running locally.
- The database credentials come from `.env` or the `DB_*` / `PG*` environment variables.
- If your default `DB_NAME` does not exist yet, set it to `postgres` or create the target database first.

## Useful commands

```bash
npm run setup-db
npm test
```

If you are troubleshooting a failing test, start by confirming PostgreSQL is reachable and that the configured database exists.
