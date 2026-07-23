# Project Backlog — Soda Soft Drink Store API

Ten issues sequenced into three milestones by dependency. Nothing here blocks on
an issue filed later. "Parallel?" indicates whether the issue can be worked at
the same time as its milestone-mates without stepping on the same files.

**Critical path:** Issue #2 (migrations) blocks five other issues — treat it as
the sprint-1 priority. Issues #1, #3, and #8 have zero dependencies; hand those
to whoever is free first.

Suggested labels to create up front: `bug`, `infra`, `security`, `feature`,
`test`, `ci`, `chore`, `dx`, `p1`.

---

## Milestone 1 — Foundation

Land these before feature work: they touch many files, so getting them in while
branches are short avoids painful rebases across the team.

### Issue #1 — Fix silent Sequelize `try/catch` that swallows model errors
**Labels:** `bug`, `p1` · **Depends on:** none · **Parallel:** yes

`db/index.js:31-76` wraps every model definition in a `try/catch` that logs
`⚠️ Sequelize not available` on *any* thrown error. Sequelize is a hard
dependency and is always installed, so what this actually swallows is typos and
mistakes inside the model files. When it fires, `models` stays `{}` and the app
crashes later with an unrelated `Cannot read properties of undefined (reading
'findByPk')`.

**Acceptance criteria**
- [ ] Model definition errors surface at startup with a clear stack trace.
- [ ] The misleading "Sequelize not available" warning is removed.
- [ ] App still fails fast (non-zero exit) if models can't be built.

---

### Issue #2 — Establish a single schema source of truth via migrations
**Labels:** `infra`, `p1` · **Depends on:** none · **Parallel:** no (solo — owns the schema)

The schema is defined twice and the copies already disagree:
`setupDatabase.js:54` declares `name VARCHAR(150)` while `models/product.js:11`
is a plain `STRING` (255). Every new column has to be edited in both places and
eventually won't be.

Adopt an ordered, reviewable migration history (e.g. `sequelize-cli`) as the
single source of truth and retire the schema role of the raw `CREATE TABLE`
script.

**Acceptance criteria**
- [ ] Migrations create the full current schema from empty.
- [ ] The product-name length discrepancy is resolved (pick one).
- [ ] `npm run setup-db` (or a documented replacement) runs the migrations.
- [ ] README updated with the new setup command.

---

### Issue #3 — Add ESLint + Prettier and format the codebase
**Labels:** `infra`, `chore` · **Depends on:** none · **Parallel:** no (do the bulk reformat alone)

`loaders/express.js:32` already carries an `eslint-disable-next-line` comment but
ESLint isn't installed. Without shared lint/format config, four editors will
produce whitespace-only diffs that bury real changes.

**Acceptance criteria**
- [ ] ESLint + Prettier configs committed.
- [ ] `npm run lint` script added.
- [ ] Whole codebase formatted in one dedicated commit.

---

### Issue #4 — Add GitHub Actions CI running the test suite on PRs
**Labels:** `infra`, `ci` · **Depends on:** #3 · **Parallel:** yes

PRs and Copilot review are already in use, but nothing runs `npm test`
automatically. Add a workflow with a `postgres:16` service container that runs
lint + tests on every PR to `main`.

**Acceptance criteria**
- [ ] Workflow runs `npm run lint` and `npm test` on pull requests.
- [ ] Postgres service container provisioned for the DB-backed tests.
- [ ] Branch protection requires the check to pass (repo admin task).

---

### Issue #5 — Add a seed script with fixed product fixtures
**Labels:** `infra`, `dx` · **Depends on:** #2 · **Parallel:** yes (after #2)

`npm run setup-db` leaves empty tables, so everyone invents their own test data
and bug reports don't reproduce. Add `npm run seed` inserting ~15 fixed sodas
(and optionally a demo user).

**Acceptance criteria**
- [ ] `npm run seed` script added, idempotent or clearly documented as reset.
- [ ] Fixtures match the migrated schema.
- [ ] README documents the seed step.

---

## Milestone 2 — Security & correctness

### Issue #6 — Add an admin role (column, JWT claim, `requireAdmin` middleware)
**Labels:** `feature`, `security`, `p1` · **Depends on:** #2 · **Parallel:** yes

`routes/product.js:29-55` is commented "(protected/admin)" but `requireAuth`
only checks that *someone* is logged in. Any registered user can
`DELETE /api/products/:id` and wipe the catalog.

**Acceptance criteria**
- [ ] `role` column added via migration (default `customer`).
- [ ] Role included in the JWT payload and read back in the passport strategy.
- [ ] `requireAdmin` middleware guards product create/update/delete.
- [ ] Tests cover customer-forbidden and admin-allowed cases.

---

### Issue #7 — Push validations into DB CHECK constraints + fix unlocked cart-add race
**Labels:** `security`, `bug` · **Depends on:** #2 · **Parallel:** yes (different files than #6)

`stock >= 0`, `quantity >= 1`, `price >= 0`, and order `status` are enforced only
by app-level Sequelize validators. Add DB `CHECK` constraints (including
`status IN (...)`) so invalid states can't be written. Also fix
`CartService.addItem` (`services/CartService.js:49-75`), which reads stock and
writes quantity without a row lock — unlike checkout, two concurrent adds can
both pass the stock check.

**Acceptance criteria**
- [ ] CHECK constraints added via migration.
- [ ] `addItem` performs its read-modify-write under a lock / atomic update.
- [ ] Test demonstrates the constraint rejects an invalid write.

---

### Issue #8 — Rate-limit auth routes and add security headers
**Labels:** `security` · **Depends on:** none · **Parallel:** yes (fully independent)

`routes/auth.js:20` accepts unlimited password guesses. Add `express-rate-limit`
to the auth router and `helmet` app-wide.

**Acceptance criteria**
- [ ] Login/register rate-limited with a sensible window.
- [ ] `helmet` enabled in the express loader.
- [ ] 429 response shape documented.

---

## Milestone 3 — Features & test depth

### Issue #9 — Admin order-status endpoint with legal-transition checks
**Labels:** `feature` · **Depends on:** #6, #7 · **Parallel:** no

Orders are created `pending` and can never change. Add
`PATCH /api/orders/:id/status` (admin only) enforcing a valid state machine
(e.g. `pending → paid → shipped → delivered`, plus `cancelled`).

**Acceptance criteria**
- [ ] Endpoint guarded by `requireAdmin` (from #6).
- [ ] Illegal transitions rejected with 409.
- [ ] Allowed transitions covered by tests.

---

### Issue #10 — End-to-end integration tests against a real test database
**Labels:** `test`, `p1` · **Depends on:** #4, #5 · **Parallel:** yes

`test/service.test.js` runs against an in-memory mock and `test/http.test.js`
only covers `/health` and 404. The register → add-to-cart → checkout path has
never run against Postgres in a test. Add `supertest` + a dedicated test DB and
cover that flow end to end.

**Acceptance criteria**
- [ ] `supertest` integration test drives the full purchase flow over HTTP.
- [ ] Test DB set up/torn down cleanly (reuses the CI Postgres from #4).
- [ ] Runs in `npm test` and in CI.

---

## Dependency graph

```
#1  (independent) ─────────────────────────► ship anytime
#3 ──► #4 ──────────────────────────────────► #10
#2 ──► #5 ──────────────────────────────────► #10
   ├─► #6 ──┐
   └─► #7 ──┴─────────────────────────────► #9
#8  (independent) ─────────────────────────► ship anytime
```
