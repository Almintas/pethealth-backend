# PetHealth backend — release and branch flow

## Branches

| Branch | Purpose |
|--------|---------|
| **`dev`** | Active development integration branch. Feature and fix work lands here first. |
| **`main`** | Production branch. Deployments should track commits merged into `main`, not ad-hoc copies of `dev`. |

## Expected flow

1. Implement a change on a feature branch (or directly on `dev` per team practice).
2. Open a pull request **into `dev`** (or push to `dev` if your process allows).
3. **GitHub Actions CI** runs on pushes to `dev` and on pull requests targeting `dev`.
4. After review and a green CI run, merge to **`dev`**.
5. When ready for production, open a reviewed pull request **`dev` → `main`**, verify CI again, then merge to **`main`**.
6. Deploy **`main`** using your platform’s versioned release process.

Do not rewrite Git history on shared branches for rollback. Roll back by redeploying a previous known-good release or version from your deployment platform.

## Required production environment variables

| Variable | Description |
|----------|-------------|
| `NODE_ENV` | Set to `production` in production. |
| `MONGODB_URI` | MongoDB connection string for the production database. If your host only provides `DATABASE_URL` or `MONGO_URL` (common on Render/Railway Mongo add-ons), set that instead — the API maps it to `MONGODB_URI` at startup. |
| `JWT_SECRET` | Signing secret for access tokens. In production it must be at least 32 characters and must not use known insecure placeholder values. **You must set this in the deployment dashboard**; a local `.env` file is not used in Docker unless you mount it. |
| `CORS_ORIGIN` | Comma-separated list of browser origins allowed to call the API (e.g. `https://app.example.com`). Required when `NODE_ENV=production`. |

Also configure `PORT` and `JWT_EXPIRES_IN` as needed for your hosting environment.

For pet profile photos, set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` on the API service. The API starts without them; upload/delete return a clear error until they are configured.

Optional: `CLOUDINARY_PET_PHOTO_FOLDER` (defaults to `pethealth/pets`).

Cloudinary asset cleanup is best-effort on replace/delete; a failed remote delete may leave an orphaned asset in Cloudinary while MongoDB stays consistent.

### Pet profile photos (REST)

Photos are **not** uploaded through GraphQL. The Owner Portal uses JWT-authenticated REST endpoints (multipart form field `photo`):

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/pets/:petId/photo` | Upload or replace the profile photo (max 5 MB; JPG/PNG/WebP validated server-side with Sharp). Returns the updated `PetModel` JSON. |
| `DELETE` | `/pets/:petId/photo` | Remove the profile photo. Returns the updated `PetModel` JSON. |

`photoUrl` is exposed on GraphQL pet queries; `photoStorageKey` (Cloudinary `public_id`) is stored in MongoDB only and is not returned to clients.

Configure the frontend with `VITE_GRAPHQL_URL` and, when the API origin differs from the GraphQL URL, `VITE_API_BASE_URL` pointing at the Nest HTTP origin (no trailing path).

## Owner Portal authorization

Accounts registered through the Owner Portal use role `USER`. They may manage their own pets, reminders, appointments, and pet photos, and **read** veterinary health data (medical records, vaccinations, medications) for pets they own.

GraphQL mutations that modify veterinary health data (`createMedicalRecord`, `updateMedicalRecord`, `deleteMedicalRecord`, vaccination mutations, medication mutations) require role `VET` or `ADMIN`. Owner accounts receive HTTP 403 / GraphQL forbidden errors if they call these mutations.

The future Veterinary System will use elevated roles (or service accounts) to write clinic-managed health data without removing these mutations from the API.

## Reminders and future notifications

Owner reminders are stored with `dueAt`, `status`, `type`, and optional `sourceType` / `sourceId` for linkage to appointments or clinic-generated items. No email or push delivery is implemented in this release; a future notification service can poll or subscribe to pending reminders and respect per-user preferences when those are added.

## Optional throttle variables

These tune rate limiting (defaults apply if omitted):

| Variable | Role |
|----------|------|
| `THROTTLE_LIMIT` | Global API request limit per window (per IP). |
| `THROTTLE_TTL_MS` | Global window length in milliseconds. |
| `THROTTLE_AUTH_LIMIT` | Stricter limit for `login` and `register` mutations. |
| `THROTTLE_AUTH_TTL_MS` | Auth window length in milliseconds. |

See `.env.example` for local development examples.

## Verification before merging to `main`

Ensure all of the following pass on the commit you intend to release:

- `npm ci`
- `npm run build`
- `npm test -- --runInBand`
- `npm run test:e2e`
- `npm run lint`

CI runs the same checks automatically on **`dev`**. Re-run or confirm CI is green on the **`dev` → `main`** pull request before merging to production.

## Rollback

Handle rollback through your **deployment platform** (redeploy a previous artifact, image tag, or release version). Do not force-push or rewrite **`main`** history to undo a bad deploy.
