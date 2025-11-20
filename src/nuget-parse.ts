import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import * as core from '@actions/core'
import { XMLBuilder, XMLParser } from 'fast-xml-parser'

import { ADO_FEED_URLS } from './vss-credentials.js'

const XML_CONFIG = {
  ignoreAttributes: false,
  allowBooleanAttributes: true,
  suppressBooleanAttributes: true,
  suppressEmptyNode: true,
} as const

export interface NugetAdoFeed {
  sourceName: string
  nugetUrl: string
}

interface NugetAddSource {
  '@_key': string
  '@_value'?: string
}

interface NugetConfig {
  '?xml': { '@_version': '1.0'; '@_encoding': 'utf-8' }
  configuration: {
    packageSources?: {
      add?: NugetAddSource | NugetAddSource[]
    }
    packageSourceCredentials?: Record<
      string,
      {
        add: [
          {
            '@_key': 'Username'
            '@_value': string
          },
          {
            '@_key': 'ClearTextPassword'
            '@_value': string
          },
        ]
      }
    >
  }
}

export function parseNugetForADOFeeds(configContent: string): NugetAdoFeed[] {
  const config = safeReadExistingNugetConfig(configContent)
  if (!config) {
    return []
  }

  const packageSourcesAdd = config.configuration.packageSources?.add

  if (!packageSourcesAdd) {
    return []
  }

  const adds = Array.isArray(packageSourcesAdd) ? packageSourcesAdd : [packageSourcesAdd]
  return adds
    .filter((add): add is NugetAddSource & { '@_value': string } => typeof add['@_value'] === 'string')
    .filter((add) => ADO_FEED_URLS.some((adoUrl) => add['@_value'].includes(adoUrl)))
    .map((add) => ({ sourceName: add['@_key'], nugetUrl: add['@_value'] }))
}

export async function buildUserNugetContent(feeds: NugetAdoFeed[], token: string): Promise<void> {
  if (feeds.length === 0) {
    core.debug('No nuget ADO feeds found, skipping writing to nuget.config')
    return
  }
  if (!core.getBooleanInput('build-nuget-credentials-file')) {
    core.debug('Skipping writing to nuget.config')
    return
  }
  const nugetCredentialFile = path.resolve(process.env.GITHUB_WORKSPACE ?? process.cwd(), '../nuget.config')

  const existingContent = await readFile(nugetCredentialFile, { encoding: 'utf8' }).catch(() => undefined)
  const existingConfig = safeReadExistingNugetConfig(existingContent) ?? {
    '?xml': { '@_version': '1.0', '@_encoding': 'utf-8' },
    configuration: {},
  }
  existingConfig.configuration.packageSourceCredentials ??= {}

  for (const feed of feeds) {
    existingConfig.configuration.packageSourceCredentials[feed.sourceName.replaceAll(' ', '_x0020_')] = {
      add: [
        {
          '@_key': 'Username',
          '@_value': 'github',
        },
        {
          '@_key': 'ClearTextPassword',
          '@_value': token,
        },
      ],
    }
  }
  const builder = new XMLBuilder({ ...XML_CONFIG, format: true })
  const newCredentialContents = builder.build(existingConfig).trim()
  try {
    await mkdir(path.dirname(nugetCredentialFile), { recursive: true })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    core.debug(`Error creating directory for nuget.config: ${errorMessage}`)
  }
  await writeFile(nugetCredentialFile, newCredentialContents, { encoding: 'utf8' })
}

function safeReadExistingNugetConfig(content: string | undefined): NugetConfig | undefined {
  if (content === undefined) {
    return undefined
  }
  const parser = new XMLParser(XML_CONFIG)
  const parsed = parser.parse(content) as unknown
  if (typeof parsed !== 'object' || parsed == null) {
    throw new Error('Failed to parse nuget.config content as XML object')
  }
  if (!('configuration' in parsed) || typeof parsed.configuration !== 'object' || parsed.configuration == null) {
    return undefined
  }
  return parsed as NugetConfig
}
