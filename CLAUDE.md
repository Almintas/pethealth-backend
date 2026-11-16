# PetHealth — project context for Claude

PetHealth is a health record system for pets, like e-sveikata.lt for people.
Owners see everything about their pets; veterinary clinics fill in the records.
The owner is Lithuanian and talks in Lithuanian — answer in Lithuanian.

## Repositories (GitHub: Almintas/…)

| Repo | What | Stack |
|---|---|---|
| pethealth-backend | Owner API | NestJS + GraphQL (code-first, Apollo) + Mongoose |
| pethealth-frontend | Owner app | React 19 + Vite + Apollo Client 4, react-i18next (LT/EN) |
| pethealth-vet-backend | Clinic API (separate DB) | NestJS + GraphQL + Mongoose |
| pethealth-vet-frontend | Clinic app; also holds the E2E suite (`e2e/`) | React 19 + Vite |

## Working rules (from the owner)

- Work directly on `dev` in every repo. **Never create other branches.**
- No staging environment.
- Code-side work only; the product is not shown to clients yet.
- When asked to "sukelti į main": main must equal dev. If main has diverged, build a merge commit
  `git commit-tree origin/dev^{tree} -p origin/main -p origin/dev -m ...` and push it to both main and dev;
  otherwise fast-forward with `git push origin origin/dev:refs/heads/main`. Do it in all four repos.
- Railway auto-deploys both backends from `main`; Vercel deploys both frontends from `main`.
- Commit as Almintas; keep commits small and descriptive.

## Architecture essentials

- Backends talk to each other over GraphQL with the `x-pethealth-service-secret` header (OWNER_SERVICE_SECRET).
- Clinic access is consented by the owner with one-time share codes; the vet backend's
  `clinic_pet_access` collection is the source of truth. Audit events live in the vet DB, and the owner
  reads them through `internalAuditEventsForPet`.
- Vet accounts: approvalStatus PENDING / APPROVED / REJECTED; `GqlRolesGuard` requires APPROVED.
  PLATFORM_ADMIN has no clinical access. Approve with `scripts/approve-veterinarian.mjs` or the admin page.
- Clinic membership roles are ADMIN / VETERINARIAN / RECEPTIONIST; a legacy membership without a role counts as ADMIN.
- Vet backend: in-memory `RateLimitGuard` (`@RateLimit`, rules in `src/common/rate-limit`), `admin_actions` audit,
  TOTP 2FA (`src/two-factor`, secrets AES-256-GCM with TWO_FACTOR_ENCRYPTION_KEY, hashed recovery codes,
  pending tokens with purpose `2fa-pending` rejected as sessions).
- Owner backend `src/account`: `exportMyData` (JSON string, internal fields stripped) and
  `deleteMyAccount(password)` (403 on a wrong password; revokes clinic access, deletes everything).
- i18n: every UI string is in both LT and EN; parity tests enforce it. Lithuanian plurals use _one/_few/_many/_other.
- Health passport PDF is built in the owner frontend (`src/features/pet-passport`): a small dependency-free
  PDF writer with an embedded DejaVu Sans subset (Lithuanian letters render everywhere). Characters outside
  the subset lose accents or become "?"; to add characters edit `scripts/generate-pdf-fonts.py` and rerun it.
  No backend endpoint; it uses the existing GraphQL queries and frontend translations.
- Attachments on medical records: bytes in MongoDB GridFS of the owner DB (bucket `medical_attachment_files`,
  metadata in `medical_record_attachments`, behind the `ATTACHMENT_STORAGE` interface in `src/attachments`).
  PDF/JPG/PNG/WebP detected from bytes, 10 MB, 20 per record. Clinics use vet REST
  `/medical-records/:recordId/attachments[/:id]` (upload needs `clinicId`; only the uploading clinic may delete);
  the vet backend proxies to owner internal REST `/internal/medical-records/...` (service secret, base derived from
  OWNER_GRAPHQL_URL). Owners download via owner REST `/medical-records/:recordId/attachments/:id` (JWT) and see
  `attachments` on records. Multer reads file names as latin1 — both backends decode them back to UTF-8.
  Audit: CREATED/DELETED + ATTACHMENT. Files go with record/pet/account deletion; export lists them.
- Appointments a clinic scheduled have `vetClinicId`; the owner app shows them read-only ("Scheduled by the clinic").
- Reminders have `managedBy` OWNER / CLINIC / AUTOMATIC (owner reminder schema: `clinicId`, `clinicName`,
  `createdByName`, `automatic`). Owners edit/delete only OWNER ones; CLINIC/AUTOMATIC can be completed or dismissed.
  Clinics: vet GraphQL `patientReminders`, `createVetReminder`, `deleteVetReminder` → owner internal
  `internalRemindersForPetForVet` / `internalCreateReminderForVet` / `internalDeleteReminderForVet` (clinic + pet must
  match). Clinics never see the owner's own reminders. `VaccinationReminderSync` (owner backend) keeps one AUTOMATIC
  VACCINATION reminder per vaccination with `nextDueAt` (moved + re-pending on date change, removed with the
  vaccination); existing vaccinations get one on their next update. Audit: CREATED/DELETED + REMINDER.

## Tests and CI (all must stay green)

- Each repo: unit tests + lint + build in GitHub Actions.
- Owner backend: `Integration (owner + clinic API)` workflow runs both backends + mongo:7 (`test/integration/full-flow.mjs` in vet-backend).
- E2E (Playwright 1.56.1, ubuntu-24.04, own `e2e/package.json`) runs all four apps; workflow in owner frontend and vet frontend.
  16 serial steps: vet register/approve → clinic → owner + pet → share code → claim → reuse rejected →
  vaccination → vet attaches lab result to a record → vet sets a reminder for the owner → owner sees it all + activity
  log (clinic reminder read-only) → owner downloads health passport PDF → owner downloads the attachment →
  receptionist invite → revoke → owner export + delete account → vet 2FA.
- The integration test (`full-flow.mjs`) also uploads an attachment via the vet API and checks the owner download,
  and sets a clinic reminder that the owner sees but cannot delete.
- No local node_modules/network in the Claude workspace: verify via CI (`gh run list -R Almintas/<repo> -b dev`).
  Don't run global prettier on whole folders — it doesn't pick up repo style; edit narrowly.

## Status (2026-11-16)

Done: core owner/clinic flows, consent codes, audit log, clinic team + invites, admin approval,
browser E2E, rate limits, admin audit, 2FA, GDPR data export + account deletion, pet health passport PDF,
attachments on medical records (all on `main`), clinic appointments read-only for owners + clinic reminders +
automatic vaccination reminders (on `dev`; ask before merging to `main`).

## Next, in order

1. Microchip search for clinics.
2. Sentry preparation (both backends + frontends).

## Production notes for the owner

- Owner backend still has NODE_ENV=development on Railway; switch to production after checking CORS_ORIGIN and secret lengths.
- Set TWO_FACTOR_ENCRYPTION_KEY on the vet backend before anyone enables 2FA, and never change it.
- VET_FRONTEND_URL must be a full https URL. RESEND_* is optional (email).
- Railway sleepApplication=true causes cold starts.
- Attachments make the owner MongoDB grow by the file sizes; watch its storage on Railway. Swapping to object
  storage later means a new `AttachmentStorage` implementation plus copying existing GridFS files.
