# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - Initial Release

### Added
- `environmentSyncing` plugin for syncing Payload CMS database content and S3 media across environments.
- Support for MongoDB collection copying with configurable collection exclusions.
- S3 media syncing with paginated object listing to handle buckets with more than 1000 objects.
- Admin-only `SyncButton` component rendered in the Payload admin toolbar.
- Configurable `adminRole` check and pluggable `access` function for endpoint authorization.
- Concurrency lock to prevent overlapping sync operations.
- Batched cursor-based database copy to avoid memory exhaustion on large collections.
- Guard against syncing an environment to itself.
- JWT token forwarded in sync requests for proper server-side authentication.