import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import * as core from '@actions/core'

const execAsync = promisify(exec)

export async function getTokenFromAzTool(): Promise<string> {
  core.debug('Getting token from az tool')

  const { stdout, stderr } = await execAsync(
    "az account get-access-token --scope '499b84ac-1321-427f-aa17-267ca6975798/.default' -o json",
    {
      encoding: 'utf8',
    },
  )

  try {
    const result = JSON.parse(stdout)
    if (!result.accessToken || typeof result.accessToken !== 'string') {
      throw new Error('No access token found in az tool output')
    }
    core.setSecret(result.accessToken)
    return result.accessToken
  } catch (error) {
    core.error(`Error acquiring token from az tool`)
    core.debug(`az tool output: ${stdout}`)
    core.debug(`az tool stderr: ${stderr}`)
    throw new Error(`Error parsing az tool output: ${error}. ${stderr}`)
  }
}
