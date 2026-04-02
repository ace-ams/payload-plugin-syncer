'use client'

import { Button, toast, useAuth, useConfig } from '@payloadcms/ui'
import React from 'react'

import type { AdminRole, Enviroments } from '../types.js'

const defaultLabels: Record<Enviroments, string> = {
  acceptance: 'ACC',
  development: 'DEV',
  production: 'PROD',
}

type SyncButtonProps = {
  adminRole?: AdminRole
  appEnviroment?: Enviroments
  enviromentLabels?: Partial<Record<Enviroments, string>>
}

export const SyncButton: React.FC<SyncButtonProps> = ({
  adminRole,
  appEnviroment,
  enviromentLabels,
}) => {
  const { user } = useAuth()
  const { config } = useConfig()

  const env =
    appEnviroment ?? ((process.env.NEXT_PUBLIC_APP_ENV ?? process.env.NODE_ENV) as Enviroments)

  const adminField = adminRole?.field ?? 'role'
  const adminValue = adminRole?.value ?? 'admin'

  const getLabel = (e: Enviroments): string => enviromentLabels?.[e] ?? defaultLabels[e]

  const handleSync = async (sourceEnv: Enviroments) => {
    const confirmed = confirm(
      `WARNING!!\nSyncing from ${getLabel(sourceEnv)} → ${getLabel(env)}. This will remove all content and replace it with data from ${getLabel(sourceEnv)}.`,
    )
    if (!confirmed) {
      return
    }

    try {
      const res = await fetch(`${config.routes.api}/sync`, {
        body: JSON.stringify({ sourceEnv }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      const data = await res.json()

      if (res.ok) {
        toast.success(data.message)
      } else {
        toast.error(data.message)
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[SYNC] Error in sync action:', err)
      toast.error('Sync failed.')
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((user as any)?.[adminField] !== adminValue) {
    return null
  }

  if (env !== 'development' && env !== 'acceptance') {
    return null
  }

  return (
    <div style={{ display: 'flex', gap: '0.5rem' }}>
      {env === 'development' && (
        <Button buttonStyle="secondary" onClick={() => handleSync('acceptance')}>
          Sync from {getLabel('acceptance')}
        </Button>
      )}
      {(env === 'acceptance' || env === 'development') && (
        <Button buttonStyle="secondary" onClick={() => handleSync('production')}>
          Sync from {getLabel('production')}
        </Button>
      )}
    </div>
  )
}

export default SyncButton
