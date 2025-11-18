import * as core from '@actions/core'
import * as fs from 'node:fs/promises'
import { dirname, basename, join } from 'node:path'
import { parseNpmrcForADOFeeds } from './npmrc-parse.js'
import { parseNugetForADOFeeds } from './nuget-parse.js'

async function readFileContents(filePath: string, parse: (content: string) => string[]): Promise<string[]> {
  core.debug(`Processing file: ${filePath}`)
  let npmrcContent: string = ''
  try {
    const directory = dirname(filePath)
    const directoryFiles = await fs.readdir(directory)
    const fileName = basename(filePath).toLowerCase()
    const matchedFile = directoryFiles.find((f) => f.toLowerCase() === fileName)
    if (!matchedFile) {
      core.debug(`File ${filePath} does not exist.`)
      return []
    }
    npmrcContent = await fs.readFile(join(directory, matchedFile), { encoding: 'utf8' })
  } catch (error) {
    core.debug(`Error reading file ${filePath}: ${error}`)
    return []
  }
  const adoFeedUrls = parse(npmrcContent)
  core.debug(`Found ADO feed URLs: ${adoFeedUrls.join(', ')}`)
  return adoFeedUrls
}

export async function readUrlsFromFiles(npmrcList: string[], nugetList: string[]): Promise<string[]> {
  const adoFeedUrlsPromises = Promise.all(
    npmrcList
      .map((filePath) => readFileContents(filePath, parseNpmrcForADOFeeds))
      .concat(nugetList.map((filePath) => readFileContents(filePath, parseNugetForADOFeeds))),
  )

  const adoFeedUrls = await adoFeedUrlsPromises
  return [...new Set(adoFeedUrls.flat())]
}
