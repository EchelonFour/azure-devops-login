import * as fs from 'node:fs/promises'
import { dirname, basename, join } from 'node:path'

import * as core from '@actions/core'

import type { NpmrcAdoFeed } from './npmrc-parse.js'
import { parseNpmrcForADOFeeds } from './npmrc-parse.js'
import type { NugetAdoFeed } from './nuget-parse.js'
import { parseNugetForADOFeeds } from './nuget-parse.js'

async function readFileContents<TFeed extends { nugetUrl: string }>(
  filePath: string,
  parse: (content: string) => TFeed[],
): Promise<TFeed[]> {
  core.debug(`Processing file: ${filePath}`)
  let npmrcContent: string = ''
  try {
    const directory = dirname(filePath)
    const directoryFiles = await fs.readdir(directory)
    const fileName = basename(filePath).toLowerCase()
    const matchedFile = directoryFiles.find((f) => f.toLowerCase() === fileName)
    if (matchedFile === undefined) {
      core.debug(`File ${filePath} does not exist.`)
      return []
    }
    npmrcContent = await fs.readFile(join(directory, matchedFile), { encoding: 'utf8' })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    core.debug(`Error reading file ${filePath}: ${errorMessage}`)
    return []
  }
  const adoFeedUrls = parse(npmrcContent)
  core.debug(`Found ADO feed URLs: ${adoFeedUrls.map((x) => x.nugetUrl).join(', ')}`)
  return adoFeedUrls
}

export async function readUrlsFromFiles(
  npmrcList: string[],
  nugetList: string[],
): Promise<{ npmFeeds: NpmrcAdoFeed[]; nugetFeeds: NugetAdoFeed[]; allNugetUrls: string[] }> {
  const npmReads = npmrcList.map(async (filePath) => readFileContents(filePath, parseNpmrcForADOFeeds))
  const nugetReads = nugetList.map(async (filePath) => readFileContents(filePath, parseNugetForADOFeeds))

  const npmFeeds = (await Promise.all(npmReads)).flat()
  const nugetFeeds = (await Promise.all(nugetReads)).flat()

  const allNugetUrls = [...new Set([...npmFeeds, ...nugetFeeds].map((x) => x.nugetUrl))]
  return {
    npmFeeds,
    nugetFeeds,
    allNugetUrls,
  }
}
