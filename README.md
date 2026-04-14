# Payload Syncer

A Payload CMS plugin that lets admins sync database content and S3 media from one environment (production or acceptance) down to a lower environment.

A sync button will appear in the admin dashboard for users that pass the access check.

---

## Installation

```sh
npm i @ace-ams/payload-syncer
```

---

## Setup

Add the plugin to your `payload.config.ts`:

```ts
import { enviromentSyncing } from '@ace-ams/payload-syncer'

export default buildConfig({
  plugins: [
    enviromentSyncing({
      currentEnv: process.env.APP_ENV as 'development' | 'acceptance' | 'production',
      databaseUrls: {
        development: process.env.DATABASE_URL!,
        acceptance: process.env.DATABASE_URL_ACC!,
        production: process.env.DATABASE_URL_PROD!,
      },
      exceptCollections: ['users'],
      s3: {
        bucket: process.env.S3_BUCKET!,
        endpoint: process.env.S3_ENDPOINT,
        region: process.env.S3_REGION,
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
      },
    }),
  ],
})
```

### Options

| Option | Type | Required | Description |
|---|---|---|---|
| `databaseUrls` | `Record<Environment, string>` | Yes | MongoDB connection strings per environment. |
| `currentEnv` | `'development' \| 'acceptance' \| 'production'` | No | The environment this deployment is running in. Falls back to `APP_ENV`, then `NODE_ENV`. |
| `access` | `(req: PayloadRequest) => boolean \| Promise<boolean>` | No | Custom access control for the sync endpoint. Replaces the default `adminRole` check when provided. |
| `adminRole` | `{ field: string, value: string }` | No | The field and value that identifies an admin user. Defaults to `{ field: 'role', value: 'admin' }`. Ignored when `access` is set. |
| `exceptCollections` | `CollectionSlug[]` | No | Collections to skip during sync. Always include sensitive collections such as `'users'`. |
| `enviromentLabels` | `Partial<Record<Environment, string>>` | No | Display labels shown in the sync button. Defaults to `DEV`, `ACC`, `PROD`. |
| `mediaCollection` | `string` | No | The slug of your upload collection. Defaults to `'media'`. |
| `s3` | `S3Config` | No | S3 credentials and bucket. Required if you store media in S3. |
| `disabled` | `boolean` | No | Disable the plugin without uninstalling it. |

---

## Access control

By default the sync button and endpoint are restricted to users whose `role` field equals `'admin'`. There are two ways to configure this.

### Option A — `adminRole` (simple field/value check)

Use this when your users collection has a single role field:

```ts
enviromentSyncing({
  adminRole: { field: 'permissions', value: 'superadmin' },
  // ...
})
```

Add the corresponding field to your users collection:

```ts
{
  slug: 'users',
  auth: true,
  fields: [
    {
      name: 'role',
      type: 'select',
      defaultValue: 'user',
      required: true,
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'User', value: 'user' },
      ],
    },
  ],
}
```

### Option B — `access` function (custom logic)

Use this for multi-role setups, JWT claims, or any custom authorization logic. When `access` is provided it fully replaces the `adminRole` check.

```ts
enviromentSyncing({
  access: (req) => req.user?.role === 'superadmin',
  // ...
})
```

The function receives the full `PayloadRequest` and must return `true` (or a promise resolving to `true`) to allow the sync.

> **Note:** The access check is enforced server-side on the `/sync` endpoint. The sync button also hides itself client-side for non-admin users, but the server-side check is the authoritative gate.

---

## Environment setup

1. Set `APP_ENV` (or `NEXT_PUBLIC_APP_ENV` for client-side env detection) to `development`, `acceptance`, or `production` on each server.
2. Set `DATABASE_URL`, `DATABASE_URL_ACC`, and `DATABASE_URL_PROD` to the MongoDB connection strings for each environment. Use `mongodb+srv://` URIs with TLS enabled for remote databases.
3. Set `S3_BUCKET`, `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY_ID`, and `S3_SECRET_ACCESS_KEY` on every environment that needs to sync media.
4. Ensure the user performing the sync has the correct admin role value in the database.

---

## How it works

### What gets synced

- **Database** — all MongoDB collections except `payload-*` system collections and any slugs listed in `exceptCollections`.
- **Media** — if `s3` is configured, objects are copied between environment prefixes inside the same bucket (e.g. `production/` → `development/`). The `prefix` field on all media documents is updated accordingly.

### What is never synced

- Collections in `exceptCollections` are skipped entirely. Always add sensitive collections such as `users` or `admins` to this list.
- Internal Payload collections prefixed with `payload-` (migrations, preferences, jobs, etc.) are always skipped.

### Safety behaviours

| Behaviour | Details |
|---|---|
| **Production writes blocked** | The sync endpoint only runs when the target environment is `development` or `acceptance`. Syncing to `production` is never allowed. |
| **Same-environment guard** | Syncing an environment to itself is rejected with a `400` error. |
| **Concurrency lock** | Only one sync can run at a time. Concurrent requests receive a `409` response until the active sync completes. |
| **Batched copy** | Collections are read via a cursor and inserted in batches of 500 documents, preventing out-of-memory errors on large datasets. |

---

## Security notes

- **Database connection strings** contain credentials — always load them from environment variables, never hardcode them.
- **Use TLS** on all remote MongoDB connections (`mongodb+srv://` or `tls=true` in the connection string).
- **`exceptCollections`** is your responsibility — always exclude collections that contain user credentials, sessions, or other sensitive data.
