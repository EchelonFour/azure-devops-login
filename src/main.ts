import * as core from '@actions/core'
import { getTokenFromAzTool } from './az-token.js'
import { readUrlsFromFiles } from './parse-urls-from-files.js'
import { ENV_VAR_NAME, loadExistingCredentials } from './vss-credentials.js'

function splitListInput(input: string | undefined): string[] {
  if (!input) {
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

    const adoFeedUrls = manualList.length > 0 ? manualList : await readUrlsFromFiles(npmrcList, nugetList)
    const endpoints = loadExistingCredentials()
    if (adoFeedUrls.length === 0) {
      core.info('No Azure DevOps feed URLs found in provided files. Skipping login and sending empty credentials.')
    } else {
      const token = await getTokenFromAzTool()

      // Debug logs are only output if the `ACTIONS_STEP_DEBUG` secret is true
      core.debug(`Building ${ENV_VAR_NAME} with URLs: ${adoFeedUrls.join(', ')}`)
      const existingUrls = new Set(endpoints.endpointCredentials.map((x) => x.endpoint))
      for (const url of adoFeedUrls) {
        if (existingUrls.has(url)) {
          core.warning(
            `Not adding the url "${url}" to the credentials because it is already there. The existing value will be kept.`,
          )
        } else {
          endpoints.endpointCredentials.push({
            endpoint: url,
            username: 'github',
            password: token,
          })
        }
      }
    }
    if (endpoints.endpointCredentials.length > 0) {
      core.exportVariable(ENV_VAR_NAME, JSON.stringify(endpoints))
    }
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
