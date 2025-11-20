import { readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import * as core from '@actions/core'
import { parse, stringify } from 'ini'

import { ADO_FEED_URLS } from './vss-credentials.js'

export interface NpmrcAdoFeed {
  npmUrl: string
  nugetUrl: string
}

export function parseNpmrcForADOFeeds(npmrcContent: string): NpmrcAdoFeed[] {
  const contents = parse(npmrcContent)
  const feeds = [
    ...new Set(
      Object.keys(contents)
        .filter((key) => key.endsWith('registry'))
        .map((key) => contents[key] as unknown)
        .filter((value) => typeof value === 'string')
        .filter((value) => value.startsWith('http'))
        .filter((value) => ADO_FEED_URLS.some((adoUrl) => value.includes(adoUrl)))
        .filter((value) => value.includes('/npm/registry/')),
    ),
  ]
  return feeds.map((registry) => ({
    npmUrl: registry,
    nugetUrl: registry.replace('/npm/registry/', '/nuget/v3/index.json'),
  }))
}

export async function buildUserNpmrcContent(feeds: NpmrcAdoFeed[], token: string): Promise<void> {
  if (feeds.length === 0) {
    core.debug('No npm ADO feeds found, skipping writing to .npmrc')
    return
  }
  if (!core.getBooleanInput('build-npmrc-credentials-file')) {
    core.debug('Skipping writing to .npmrc')
    return
  }
  const npmrcFile: string =
    process.env.NPM_CONFIG_USERCONFIG ?? path.resolve(process.env.RUNNER_TEMP ?? tmpdir(), '.npmrc')
  const existingContent = await readFile(npmrcFile, { encoding: 'utf8' }).catch(() => undefined)
  const existingConfigs = existingContent !== undefined ? parse(existingContent) : {}

  for (const feed of feeds) {
    const registryKey = `${feed.npmUrl.replace(/^https?:/, '')}:_authToken`
    existingConfigs[registryKey] = token
  }
  const newNpmrcContent = stringify(existingConfigs)
  await writeFile(npmrcFile, newNpmrcContent, { encoding: 'utf8' })

  if (process.env.NPM_CONFIG_USERCONFIG !== npmrcFile) {
    core.exportVariable('NPM_CONFIG_USERCONFIG', npmrcFile)
  }
}
