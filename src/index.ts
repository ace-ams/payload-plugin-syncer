import type { Config } from 'payload'

import { createSyncHandler } from './endpoints/sync.js'

export type { AdminRole, Enviroments, EnviromentSyncingConfig, S3Config } from './types.js'
import type { EnviromentSyncingConfig } from './types.js'

export const enviromentSyncing =
  (pluginOptions: EnviromentSyncingConfig) =>
  (config: Config): Config => {
    if (pluginOptions.disabled) {
      return config
    }

    if (!config.admin) {
      config.admin = {}
    }
    if (!config.admin.components) {
      config.admin.components = {}
    }
    if (!config.admin.components.actions) {
      config.admin.components.actions = []
    }
    config.admin.components.actions.push({
      clientProps: {
        adminRole: pluginOptions.adminRole,
        appEnviroment: pluginOptions.currentEnv,
        enviromentLabels: pluginOptions.enviromentLabels,
      },
      path: '@ace-ams/payload-syncer/client#SyncButton',
    })

    if (!config.endpoints) {
      config.endpoints = []
    }
    config.endpoints.push({
      handler: createSyncHandler(pluginOptions),
      method: 'post',
      path: '/sync',
    })

    return config
  }
