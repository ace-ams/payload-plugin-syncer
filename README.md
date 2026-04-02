# Environment Syncing

A Payload CMS plugin that lets admins sync database content and S3 media from one environment (production or acceptance) down to a lower environment.

A sync button will appear in the admin dashboard for users with `role: 'admin'`.

---

## Installation

```sh
pnpm add enviroment-syncing
```

---

## Setup

Add the plugin to your `payload.config.ts`:

```ts
import { enviromentSyncing } from 'enviroment-syncing'

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
| `currentEnv` | `'development' \| 'acceptance' \| 'production'` | No | The environment this deployment is running in. Falls back to `APP_ENV`, then `NODE_ENV`. |
| `databaseUrls` | `Record<Environment, string>` | Yes | MongoDB connection strings per environment. |
| `exceptCollections` | `CollectionSlug[]` | No | Collections to skip during sync. Always include `'users'`. |
| `s3` | `S3Config` | No | S3 credentials and bucket. Required if you use S3 for media. |
| `disabled` | `boolean` | No | Disable the plugin without uninstalling it. |

### User role

The sync button is only visible to users with `role: 'admin'`. Add a `role` field to your users collection:

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

---

## Environment setup

1. Set `APP_ENV` to `development`, `acceptance`, or `production` on each server.
2. Set `DATABASE_URL`, `DATABASE_URL_ACC`, and `DATABASE_URL_PROD` to the MongoDB connection strings for each environment.
3. Set `S3_BUCKET`, `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY_ID`, and `S3_SECRET_ACCESS_KEY` on every environment that needs to sync media.
4. Ensure the user performing the sync has `role: 'admin'` in the database.
