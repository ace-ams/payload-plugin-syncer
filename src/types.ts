import type { CollectionSlug } from 'payload'

export type Enviroments = 'acceptance' | 'development' | 'production'

export type S3Config = {
  accessKeyId: string
  bucket: string
  endpoint?: string
  region?: string
  secretAccessKey: string
}

export type AdminRole = {
  /**
   * The field name on the user document that holds the role.
   * @default 'role'
   */
  field: string
  /**
   * The value that grants admin access.
   * @default 'admin'
   */
  value: string
}

export type EnviromentSyncingConfig = {
  /**
   * Configure which field and value identifies an admin user.
   * Defaults to `{ field: 'role', value: 'admin' }`.
   */
  adminRole?: AdminRole

  /**
   * The current deployment environment.
   * Explicitly set this when your deployment environment differs from NODE_ENV.
   * Falls back to the APP_ENV environment variable, then NODE_ENV.
   *
   * @example 'acceptance'
   */
  currentEnv?: Enviroments

  /**
   * MongoDB connection strings per environment. Required for syncing to work.
   *
   * @example
   * {
   *   development: process.env.DATABASE_URL,
   *   acceptance: process.env.DATABASE_URL_ACC,
   *   production: process.env.DATABASE_URL_PROD,
   * }
   */
  databaseUrls: Record<Enviroments, string>

  /**
   * Disable the plugin without uninstalling it.
   */
  disabled?: boolean

  /**
   * Display labels for each environment shown in the sync button UI.
   * Defaults to DEV / ACC / PROD.
   *
   * @example { development: 'DEV', acceptance: 'ACC', production: 'PROD' }
   */
  enviromentLabels?: Partial<Record<Enviroments, string>>

  /**
   * Collections to exclude from syncing.
   * Always exclude collections that contain sensitive data such as users.
   *
   * @example ['users', 'admins']
   */
  exceptCollections?: CollectionSlug[]

  /**
   * The slug of the upload collection used for media.
   * Used to update the prefix field on media documents after a sync.
   * @default 'media'
   */
  mediaCollection?: string

  /**
   * S3 configuration for media syncing.
   * Required when your media is stored in an S3-compatible bucket.
   */
  s3?: S3Config
}
