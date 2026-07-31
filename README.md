# 🥤 Soda Soft Drink Store — E-Commerce REST API

A Codecademy portfolio-project REST API for a soda soft-drink store, built with
**Node.js, Express, PostgreSQL (Sequelize ORM), Passport (JWT)** and documented
with **Swagger UI** and **Scalar**.

## Features

- 🔐 **Auth** — register / login with hashed passwords and JWTs
- 🥫 **Products** — list, search and filter soda drinks; single-drink details
- 🛒 **Cart** — add / update / remove items, view totals
- 📦 **Orders** — transactional checkout with stock reservation & order history
- 👤 **Users** — view and update your profile
- 🧩 **Sequelize ORM** — models, associations, validations & transactions (no raw SQL)
- 📖 **Two docs UIs** — Swagger UI at `/api-docs`, Scalar reference at `/reference`

## Project structure

```
soda-soft-drink-store-api/
├── db/            # Sequelize connection + model registry & associations
├── loaders/       # Express, Passport & docs (Swagger UI + Scalar) setup
├── models/        # Sequelize model definitions (one per table)
├── resources/     # ERD diagram & shared assets
├── routes/        # HTTP endpoints → services
├── services/      # Business logic (uses the ORM models)
├── config.js      # Env-driven settings
├── index.js       # App entry point
├── setupDatabase.js  # Ensures DB exists, then runs Sequelize migrations
└── swagger.yml    # OpenAPI spec (shared by both docs UIs)
```

Request flow: **routes → services → models (Sequelize) → db**.

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [PostgreSQL](https://www.postgresql.org/) 13+ (running locally)

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp example.env .env        # (Windows: copy example.env .env)
# then edit .env with your PostgreSQL credentials + a JWT secret

# 3. Create the database (once), e.g. via psql:
#    CREATE DATABASE soda_store;

# 4. Create tables from migrations
npm run setup-db

# 5. Start the API
npm start          # or: npm run dev  (auto-reload with nodemon)
```

## Testing

The project uses Node's built-in test runner. Run the suite with:

```bash
npm test
```

The test coverage currently includes:

- PostgreSQL setup verification via `setupDatabase.js`
- An Express smoke test for `/health` and the 404 handler

See [TESTING.md](TESTING.md) for the full test workflow and environment notes.

The server prints its URL on boot (default <http://localhost:4001>).
Interactive docs:

- **Scalar** (recommended): <http://localhost:4001/reference>
- **Swagger UI**: <http://localhost:4001/api-docs>

> ℹ️ Scalar loads its render bundle from a CDN, so `/reference` needs internet
> access at runtime. Swagger UI is fully self-hosted and works offline.

## Environment variables

See [`example.env`](example.env). Key ones:

| Variable      | Purpose                          | Default                 |
| ------------- | -------------------------------- | ----------------------- |
| `PORT`        | HTTP port                        | `4001`                  |
| `PGHOST` etc. | PostgreSQL connection            | localhost / soda_store  |
| `JWT_SECRET`  | Secret used to sign tokens       | _change me_             |
| `CORS_ORIGIN` | Allowed frontend origin(s)       | `http://localhost:3000` |

## API quick reference

All routes are prefixed with `/api`. 🔒 = requires `Authorization: Bearer <token>`.

| Method | Endpoint                     | Description                     |
| ------ | ---------------------------- | ------------------------------- |
| POST   | `/auth/register`             | Create account, get token       |
| POST   | `/auth/login`                | Log in, get token               |
| GET    | `/products`                  | List / search sodas             |
| GET    | `/products/:id`              | Single drink details            |
| POST   | `/products` 🔒               | Create product                  |
| PUT    | `/products/:id` 🔒           | Update product                  |
| DELETE | `/products/:id` 🔒           | Delete product                  |
| GET    | `/cart` 🔒                   | View cart                       |
| POST   | `/cart/items` 🔒             | Add item to cart                |
| PUT    | `/cart/items/:productId` 🔒  | Set quantity (0 removes)        |
| DELETE | `/cart/items/:productId` 🔒  | Remove item                     |
| DELETE | `/cart` 🔒                   | Empty cart                      |
| POST   | `/orders` 🔒                 | Checkout (cart → order)         |
| GET    | `/orders` 🔒                 | Order history                   |
| GET    | `/orders/:id` 🔒             | Single order + items            |
| GET    | `/users/me` 🔒               | Your profile                    |
| PUT    | `/users/me` 🔒               | Update profile                  |

### Example: register → browse → add to cart → checkout

```bash
# Register (returns { user, token })
curl -X POST http://localhost:4001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Renee","email":"renee@example.com","password":"hunter2"}'

TOKEN=... # copy the token from the response

# Browse sodas
curl http://localhost:4001/api/products

# Add product #1 to cart
curl -X POST http://localhost:4001/api/cart/items \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"productId":1,"quantity":2}'

# Checkout
curl -X POST http://localhost:4001/api/orders \
  -H "Authorization: Bearer $TOKEN"
```

## Team & roles

| Role                | Owner        | Area                                         |
| ------------------- | ------------ | -------------------------------------------- |
| Team Lead           | Hector & Eraj| Review / merge, timeline                     |
| Database Engineer   | Renee        | `db/`, `setupDatabase.js`, `models/`, ERD    |
| Back-End Developer  | Kyle         | `loaders/`, `routes/`, `services/`, swagger  |
| Front-End Developer | Dubem        | Frontend app (separate repo) → this API      |
| Docs + GitHub Lead  | Goodness     | `.gitignore`, `README.md`, guides            |

## License

MIT
