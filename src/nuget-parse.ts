import { XMLParser } from 'fast-xml-parser'
import { ADO_FEED_URLS } from './vss-credentials.js'

interface NugetAddSource {
  '@_value'?: string
}

interface NugetConfig {
  configuration: {
    [key: string | 'config' | 'packageSources']: {
      add?: NugetAddSource | NugetAddSource[]
    }
  }
}

export function parseNugetForADOFeeds(configContent: string): string[] {
  const parser = new XMLParser({ ignoreAttributes: false })
  const parsed = parser.parse(configContent) as NugetConfig
  if (typeof parsed !== 'object' || parsed == null) {
    throw new Error('Failed to parse nuget.config content as XML object')
  }
  if (!parsed.configuration || typeof parsed.configuration !== 'object' || parsed.configuration == null) {
    return []
  }

  const feeds = Object.values(parsed.configuration).flatMap((section) => {
    if (!section.add) {
      return []
    }

    const adds = Array.isArray(section.add) ? section.add : [section.add]
    return adds
      .map((add) => add['@_value'])
      .filter((value) => typeof value === 'string')
      .filter((value) => ADO_FEED_URLS.some((adoUrl) => value.includes(adoUrl)))
  })
  return [...new Set(feeds)]
}
