import type { PayloadRequest } from 'payload'

import * as AWS from '@aws-sdk/client-s3'
import { MongoClient } from 'mongodb'

import type { Enviroments, EnviromentSyncingConfig } from '../types.js'

const ENABLED_ENVS: Enviroments[] = ['acceptance', 'development']

export function createSyncHandler(pluginOptions: EnviromentSyncingConfig) {
  return async function syncHandler(req: PayloadRequest): Promise<Response> {
    if (!req.user) {
      return Response.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((req.user as any).role !== 'admin') {
      return Response.json({ message: 'Unauthorized' }, { status: 401 })
    }

    if (!req.json) {
      return Response.json({ message: 'No request body' }, { status: 400 })
    }

    const data = await req.json()
    const { sourceEnv } = data as { sourceEnv: Enviroments }

    const env = (pluginOptions.currentEnv ??
      process.env.APP_ENV ??
      process.env.NODE_ENV) as Enviroments

    if (!ENABLED_ENVS.includes(env)) {
      return Response.json(
        { message: 'Sync is not available in this environment' },
        { status: 400 },
      )
    }

    if (!sourceEnv) {
      return Response.json({ message: 'sourceEnv is required' }, { status: 400 })
    }

    if (sourceEnv !== 'acceptance' && sourceEnv !== 'production') {
      return Response.json({ message: 'Invalid sourceEnv' }, { status: 400 })
    }

    const { databaseUrls } = pluginOptions

    if (!databaseUrls) {
      return Response.json({ message: 'No database URLs configured' }, { status: 500 })
    }

    const connectionStringSource = databaseUrls[sourceEnv]
    const connectionStringTarget = databaseUrls[env]

    if (!connectionStringSource) {
      return Response.json({ message: 'No connection string for sourceEnv' }, { status: 500 })
    }

    if (!connectionStringTarget) {
      return Response.json({ message: 'No connection string for targetEnv' }, { status: 500 })
    }

    const exceptCollections = pluginOptions.exceptCollections ?? []

    await copyDatabase(connectionStringSource, connectionStringTarget, exceptCollections)
    const { s3 } = pluginOptions
    if (s3?.bucket && s3?.accessKeyId && s3?.secretAccessKey) {
      await copyMedia(sourceEnv, env, pluginOptions)
      await refactorMedia(connectionStringTarget, env)
    }

    return Response.json({ message: 'Sync successful', success: true })
  }
}

/**
 * Copy all collections from the source database to the target database.
 * Collections listed in exceptCollections and internal payload-* collections are skipped.
 */
async function copyDatabase(
  connectionStringSource: string,
  connectionStringTarget: string,
  exceptCollections: string[],
): Promise<void> {
  const sourceConnection = new MongoClient(connectionStringSource)
  const targetConnection = new MongoClient(connectionStringTarget)

  await sourceConnection.connect()
  await targetConnection.connect()

  const sourceDb = sourceConnection.db()
  const targetDb = targetConnection.db()

  const collections = await sourceDb.listCollections().toArray()

  for (const collection of collections) {
    if (exceptCollections.includes(collection.name)) {
      continue
    }
    if (collection.name.startsWith('payload-')) {
      continue
    }

    const sourceCollection = sourceDb.collection(collection.name)
    const targetCollection = targetDb.collection(collection.name)

    const documents = await sourceCollection.find().toArray()

    await targetCollection.deleteMany({})
    if (documents.length > 0) {
      await targetCollection.insertMany(documents, { ordered: false })
    }
  }

  await sourceConnection.close()
  await targetConnection.close()
  // eslint-disable-next-line no-console
  console.log('[SYNC] Synced all collections')
}

/**
 * Copy media objects in S3 from one environment prefix to another.
 * S3 credentials and bucket are taken from the plugin options.
 */
async function copyMedia(
  from: Enviroments,
  to: Enviroments,
  pluginOptions: EnviromentSyncingConfig,
): Promise<void> {
  const { s3 } = pluginOptions

  if (!s3) {
    return Promise.reject(new Error('S3 not configured in plugin options'))
  }

  const { accessKeyId, bucket, endpoint, region, secretAccessKey } = s3

  const clientConfig: AWS.S3ClientConfig = {
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    endpoint,
    region,
  }

  const fromPrefix = from === 'acceptance' ? 'acceptance' : 'production'
  const toPrefix = to === 'acceptance' ? 'acceptance' : 'development'

  const client = new AWS.S3(clientConfig)
  const data = await client.listObjects({ Bucket: bucket, Prefix: fromPrefix })

  if (!data.Contents?.length) {
    return Promise.reject(new Error('No objects found in source bucket'))
  }

  // eslint-disable-next-line no-console
  console.log('[SYNC] Found', data.Contents.length, 'objects in source bucket')

  for (const item of data.Contents) {
    if (!item.Key) {
      continue
    }

    const key = item.Key.replace(fromPrefix + '/', '')
    const fromPath = item.Key
    const toPath = `${toPrefix}/${key}`

    await client
      .copyObject({
        Bucket: bucket,
        CopySource: encodeURI(`${bucket}/${fromPath}`),
        Key: toPath,
      })
      .catch((err: unknown) => {
        // eslint-disable-next-line no-console
        console.log('[SYNC] copy error', key, err)
      })
  }

  // eslint-disable-next-line no-console
  console.log('[SYNC] Copied', data.Contents.length, 'objects from source bucket')
}

/**
 * Update the prefix field on all media documents in the target database
 * to match the target environment prefix.
 */
async function refactorMedia(connectionString: string, toPrefix: Enviroments): Promise<void> {
  const connection = new MongoClient(connectionString)
  await connection.connect()

  const db = connection.db()
  const collection = db.collection('media')
  const media = collection.find({})

  while (await media.hasNext()) {
    const doc = await media.next()
    if (!doc || !doc.prefix || doc.prefix === toPrefix) {
      continue
    }
    await collection.replaceOne({ _id: doc._id }, { ...doc, prefix: toPrefix })
  }

  await connection.close()
  // eslint-disable-next-line no-console
  console.log('[SYNC] Refactored media prefixes')
}
