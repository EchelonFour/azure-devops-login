import * as core from '@actions/core'

interface VssNugetExternalFeedEndpoint {
  endpoint: string
  username?: string
  password: string
}

export interface VssNugetExternalFeedEndpoints {
  endpointCredentials: VssNugetExternalFeedEndpoint[]
}

export const ENV_VAR_NAME = 'VSS_NUGET_EXTERNAL_FEED_ENDPOINTS' as const
export const ADO_FEED_URLS = ['.pkgs.visualstudio.com', 'pkgs.dev.azure.com'] as const

export function loadExistingCredentials(): VssNugetExternalFeedEndpoints {
  const empty: VssNugetExternalFeedEndpoints = { endpointCredentials: [] }
  const existingInEnv = process.env[ENV_VAR_NAME]
  if (existingInEnv === undefined || typeof existingInEnv !== 'string') {
    return empty
  }
  try {
    const parsed = JSON.parse(existingInEnv) as unknown
    if (typeof parsed !== 'object' || parsed == null) {
      throw new Error('existing credentials are there, but not in an expected format')
    }
    if (!('endpointCredentials' in parsed) || !Array.isArray(parsed.endpointCredentials)) {
      throw new Error('credential env var does not have an expected endpointCredentials array')
    }
    if (
      parsed.endpointCredentials.some(
        (x: unknown) => typeof x !== 'object' || x == null || !('endpoint' in x) || typeof x.endpoint !== 'string',
      )
    ) {
      throw new Error('the existing credentials in the env object have an unknown format')
    }
    return parsed as VssNugetExternalFeedEndpoints
  } catch (error) {
    core.error('error while trying to parse the existing credentials, overriding whatever was there')
    core.debug(`error ${error instanceof Error ? error.message : String(error)}`)
  }
  return empty
}

export function setVssCredentials(urls: string[], token: string): void {
  const endpoints = loadExistingCredentials()

  // Debug logs are only output if the `ACTIONS_STEP_DEBUG` secret is true
  core.debug(`Building ${ENV_VAR_NAME} with URLs: ${urls.join(', ')}`)
  const existingUrls = new Set(endpoints.endpointCredentials.map((x) => x.endpoint))
  for (const url of urls) {
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
  core.exportVariable(ENV_VAR_NAME, JSON.stringify(endpoints))
}
