import type { CollectionSlug } from 'payload'

export type Enviroments = 'acceptance' | 'development' | 'production'

export type S3Config = {
  accessKeyId: string
  bucket: string
  endpoint?: string
  region?: string
  secretAccessKey: string
}

export type EnviromentSyncingConfig = {
  /**
   * The current deployment environment.
   * Explicitly set this when your deployment environment differs from NODE_ENV.
   * Falls back to the APP_ENV environment variable, then NODE_ENV.
   *
   * @example 'acceptance'
   */
  currentEnv?: Enviroments

  /**
   * URLs for the database connections per environment.
   * Required for database syncing to work.
   *
   * @example
   * {
   *   development: process.env.DATABASE_URL,
   *   acceptance: process.env.DATABASE_URL_ACC,
   *   production: process.env.DATABASE_URL_PROD,
   * }
   */
  databaseUrls?: Record<Enviroments, string>

  /**
   * Disable the plugin entirely.
   */
  disabled?: boolean

  /**
   * Custom display labels for each environment, shown in the sync button UI.
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
   * S3 configuration for media syncing.
   * Required when your media is stored in an S3-compatible bucket.
   */
  s3?: S3Config
}
