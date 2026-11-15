# PetHealth — Owner API

Backend for the PetHealth owner portal: a pet health record system (like
e-sveikata.lt, but for pets). Pet owners keep their pets' profiles, reminders
and appointments here, and see the medical records, vaccinations and
medications their veterinary clinic adds.

- **NestJS 11**, **GraphQL** (Apollo, code-first) at `/graphql`, **MongoDB** (Mongoose).
- REST endpoints for pet profile photos (`POST`/`DELETE /pets/:petId/photo`, stored on Cloudinary).
- Email reminders and account-activation emails via Resend; a scheduler checks for due reminders every 10 minutes.
- Internal GraphQL operations (`internal*`) for the clinic API, protected by the `x-pethealth-service-secret` header.

**Roles and access.** Owners (`USER`) manage their pets, reminders and
appointments and *read* clinic-managed health data. Clinics can only reach a pet
after the owner shares a one-time code (or when the clinic registered the pet
and its owner); owners can revoke access. Clinics cannot edit or take over an
owner account that has been claimed.

## Environment variables

Copy `.env.example` to `.env`. Values in the example work for local development.

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | | `development` (default), `production` or `test`. |
| `PORT` | | HTTP port, default `3000`. |
| `MONGODB_URI` | yes | MongoDB connection string. `DATABASE_URL` / `MONGO_URL` are accepted as fallbacks. |
| `JWT_SECRET` | yes | Access-token signing secret; 32+ characters and not a known placeholder in production. |
| `JWT_EXPIRES_IN` | | Token lifetime, e.g. `1d`. |
| `CORS_ORIGIN` | prod | Comma-separated browser origins. Defaults to `localhost:5173` / `127.0.0.1:5173` outside production. |
| `THROTTLE_LIMIT`, `THROTTLE_TTL_MS` | | Global rate limit (requests per window, per IP). |
| `THROTTLE_AUTH_LIMIT`, `THROTTLE_AUTH_TTL_MS` | | Stricter limit for login and registration. |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | | Pet photo storage. Leave empty locally; uploads then return a clear "not available" error. |
| `CLOUDINARY_PET_PHOTO_FOLDER` | | Folder prefix, default `pethealth/pets`. |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | | Transactional email. Without a key, emails are skipped and activation links are logged to the console (outside production). |
| `FRONTEND_URL` | | Owner portal URL used in email links (no trailing slash). |
| `ENABLE_DEV_EMAIL_TEST` | | `true` enables the `sendTestNotificationEmail` mutation outside production. |
| `OWNER_SERVICE_SECRET` | yes* | Shared secret with the clinic API (same value in both). 32+ characters in production. |
| `VET_GRAPHQL_URL` | | Clinic API GraphQL URL; needed for owners to see and revoke clinic access. |

\* Needed for the clinic integration.

## Scripts

| Command | What it does |
|---------|--------------|
| `npm run start:dev` | Start with watch mode on port 3000. |
| `npm run build` / `npm run start:prod` | Build to `dist/` and run it. |
| `npm test` | Unit tests (Jest). |
| `npm run test:e2e` | End-to-end GraphQL tests against an in-memory MongoDB (downloads a MongoDB binary on first run). |
| `npm run lint` / `npm run lint:check` | ESLint + Prettier, with or without auto-fix (CI uses `lint:check`). |

CI (`.github/workflows/backend-ci.yml`) builds, runs unit and e2e tests and lints
on every push and pull request to `dev`. Branching, releases and production
settings are described in [docs/release.md](docs/release.md).

## Run the whole system locally

PetHealth is four repositories that run side by side:

| Repo | What it is | Local URL |
|------|------------|-----------|
| [`pethealth-backend`](https://github.com/Almintas/pethealth-backend) | Owner API (NestJS, GraphQL, MongoDB) | http://localhost:3000/graphql |
| [`pethealth-vet-backend`](https://github.com/Almintas/pethealth-vet-backend) | Clinic API, own database | http://localhost:3001/graphql |
| [`pethealth-frontend`](https://github.com/Almintas/pethealth-frontend) | Owner portal (React, Vite) | http://localhost:5173 |
| [`pethealth-vet-frontend`](https://github.com/Almintas/pethealth-vet-frontend) | Clinic app (React, Vite) | http://localhost:5174 |

The owner API owns all pet health data. The clinic API keeps clinics, vets and
access grants in its own database and reads/writes owner data through the owner
API's internal GraphQL, authenticated with the `x-pethealth-service-secret`
header (`OWNER_SERVICE_SECRET`, same value in both backends).

### 1. Prerequisites

- Node.js 22 or newer and npm.
- MongoDB 7 on `localhost:27017`. With Docker:

  ```bash
  docker run -d --name pethealth-mongo -p 27017:27017 mongo:7
  ```

### 2. Install and configure

Clone the four repositories next to each other, then in **each** one:

```bash
cp .env.example .env
npm install
```

The example files already point the services at each other and share the same
development `OWNER_SERVICE_SECRET`, so no edits are needed for local use.

### 3. Start everything (four terminals, in this order)

```bash
# pethealth-backend
npm run start:dev        # owner API on :3000

# pethealth-vet-backend
npm run start:dev        # clinic API on :3001

# pethealth-frontend
npm run dev              # owner portal on :5173

# pethealth-vet-frontend
npm run dev              # clinic app on :5174
```

The frontends use fixed ports (`strictPort`); if a port is taken, Vite stops
instead of silently moving, because CORS and email links expect these ports.

### 4. Create and approve a veterinarian

1. Open http://localhost:5174/register and sign up with a licence number.
   The app shows the *pending approval* screen.
2. In `pethealth-vet-backend`, list pending accounts and approve one after
   checking the licence number against the official register:

   ```bash
   npm run vet:approve -- --list
   npm run vet:approve -- vet@clinic.lt            # approve
   npm run vet:approve -- vet@clinic.lt --reject   # reject
   ```

3. Back in the clinic app, press **Check again** (or sign in again).

Or approve in the app: make one account a PetHealth platform admin, then use
its **Vet approvals** page (`/admin/veterinarians`). Platform admins have no
clinic or patient access.

```bash
npm run admin:grant -- admin@pethealth.lt   # in pethealth-vet-backend; register the account first
```

### 5. Create a clinic

An approved vet without a clinic sees **Create your clinic** on the dashboard
and on *My clinic*. For a quick demo setup you can instead run, in
`pethealth-vet-backend`:

```bash
node scripts/seed-demo-clinic.mjs
```

It takes the **first registered** veterinarian profile, approves that account,
creates *PetHealth Vet Demo Clinic* and an active membership. It is safe to run
again. Register your vet before running it.

Both scripts use `MONGODB_URI` from the shell environment (they do not read
`.env`) and default to `mongodb://localhost:27017/pethealth_vet_dev`. Prefix the
command if your database differs, e.g.
`MONGODB_URI=mongodb://… node scripts/seed-demo-clinic.mjs`.

### 6. Try the main flows

- **Clinic registers a new owner and pet** (clinic app → Patients → *Add patient*).
  The owner gets an activation email. Without `RESEND_API_KEY`, the owner API
  prints the activation link in its console instead (development only); open
  it to set a password at `/activate-account`.
- **Clinic team**: on *My clinic*, a clinic administrator invites colleagues by
  email (veterinarian, receptionist or administrator). The invitee opens the
  link (`/invite`) and joins with an existing account or creates one;
  receptionists are approved at once, vets still need PetHealth approval.
  Without Resend configured, the link is printed in the clinic API log and
  shown to the admin to copy.
- **Activity log**: every view (at most once per 30 minutes per person) and
  every change a clinic makes is recorded. The owner sees it on the pet page
  under *Activity log*.
- **Existing owner shares a pet**: in the owner portal open a pet →
  *Clinic access* → *Create code for clinic*. In the clinic app use
  *Add by owner code*. Codes are single-use and valid for 15 minutes; the
  owner gets an email saying which clinic now has access and can revoke it
  at any time.
- Records, vaccinations, medications and appointments added by the clinic
  appear in the owner portal.
