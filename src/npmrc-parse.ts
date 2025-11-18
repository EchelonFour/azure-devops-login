import { parse } from 'ini'

import { ADO_FEED_URLS } from './vss-credentials.js'

export function parseNpmrcForADOFeeds(npmrcContent: string): string[] {
  const contents = parse(npmrcContent)
  const feeds = Object.keys(contents)
    .filter((key) => key.endsWith('registry'))
    .map((key) => contents[key] as unknown)
    .filter((value) => typeof value === 'string')
    .filter((value) => value.startsWith('http'))
    .filter((value) => ADO_FEED_URLS.some((adoUrl) => value.includes(adoUrl)))
    .filter((value) => value.includes('/npm/registry/'))
    .map((registry) => registry.replace('/npm/registry/', '/nuget/v3/index.json'))
  return [...new Set(feeds)]
}
