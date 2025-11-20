import * as core from '@actions/core'

import { getTokenFromAz } from './az-token.js'
import { buildUserNpmrcContent } from './npmrc-parse.js'
import { buildUserNugetContent } from './nuget-parse.js'
import { readUrlsFromFiles } from './parse-urls-from-files.js'
import { installProviderIfNeeded } from './provider-installer.js'
import { setVssCredentials } from './vss-credentials.js'

function splitListInput(input: string | null | undefined): string[] {
  if (input == null) {
    return []
  }
  return input
    .split(/,|\n/g)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const npmrcList = splitListInput(core.getInput('npmrc'))
    const nugetList = splitListInput(core.getInput('nuget'))
    const manualList = splitListInput(core.getInput('login-urls'))

    if (manualList.length > 0) {
      setVssCredentials(manualList, await getTokenFromAz())
    } else {
      const adoFeedUrls = await readUrlsFromFiles(npmrcList, nugetList)
      if (adoFeedUrls.allNugetUrls.length === 0) {
        core.info('No Azure DevOps feed URLs found in provided files. Skipping login and sending empty credentials.')
        return
      }
      const token = await getTokenFromAz()
      setVssCredentials(adoFeedUrls.allNugetUrls, token)
      await Promise.all([
        buildUserNpmrcContent(adoFeedUrls.npmFeeds, token),
        buildUserNugetContent(adoFeedUrls.nugetFeeds, token),
      ])
    }
    await installProviderIfNeeded()
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) {
      core.setFailed(error.message)
    }
  }
}
