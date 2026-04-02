'use client'

import { Button, toast, useAuth } from '@payloadcms/ui'
import React from 'react'

type Enviroments = 'acceptance' | 'development' | 'production'

export const SyncButton: React.FC = () => {
  const { user } = useAuth()
  const env: Enviroments = process.env.NODE_ENV as Enviroments

  const handleSync = async (sourceEnv: Enviroments) => {
    const confirmed = confirm(
      `WARNING!! \nSyncing from ${sourceEnv === 'acceptance' ? 'ACC' : 'PROD'} -> ${env === 'development' ? 'DEV' : 'ACC'}. This will remove all content and copy it from ${sourceEnv === 'acceptance' ? 'ACC' : 'PROD'}.`,
    )
    if (!confirmed) return

    try {
      const res = await fetch('/api/sync', {
        body: JSON.stringify({ sourceEnv }),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      })
      const data = await res.json()

      console.log('Sync API Response:', data)

      if (res.ok) {
        toast.success(data.message)
      } else {
        toast.error(data.message)
      }
    } catch (err) {
      console.error('Error in sync action:', err)
      toast.error('Error simulating media sync.')
    }
  }

  if (user?.role !== 'admin') {
    return null
  }

  if (env !== 'development' && env !== 'acceptance') {
    return null
  }

  return (
    <div style={{ display: 'flex', gap: '0.5rem' }}>
      {env === 'development' && (
        <Button buttonStyle="secondary" onClick={() => handleSync('acceptance')}>
          Sync from ACC
        </Button>
      )}
      {(env === 'acceptance' || env === 'development') && (
        <Button buttonStyle="secondary" onClick={() => handleSync('production')}>
          Sync from PROD
        </Button>
      )}
    </div>
  )
}

export default SyncButton
