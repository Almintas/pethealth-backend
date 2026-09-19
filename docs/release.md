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
| `MONGODB_URI` | MongoDB connection string for the production database. |
| `JWT_SECRET` | Signing secret for access tokens. In production it must be at least 32 characters and must not use known insecure placeholder values. |
| `CORS_ORIGIN` | Comma-separated list of browser origins allowed to call the API (e.g. `https://app.example.com`). Required when `NODE_ENV=production`. |

Also configure `PORT` and `JWT_EXPIRES_IN` as needed for your hosting environment.

For pet profile photos, set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` on the API service. The API starts without them; upload/delete return a clear error until they are configured.

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
