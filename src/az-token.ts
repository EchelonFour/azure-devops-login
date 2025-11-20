import { exec } from 'node:child_process'
import { promisify } from 'node:util'

import * as core from '@actions/core'
import { ClientAssertionCredential } from '@azure/identity'

const execAsync = promisify(exec)

const SCOPE = '499b84ac-1321-427f-aa17-267ca6975798/.default' // this scope is for Azure DevOps and lets you do package operations

export async function getTokenFromAzTool(): Promise<string> {
  core.debug('Getting token from az tool')

  const { stdout, stderr } = await execAsync(`az account get-access-token --scope '${SCOPE}' -o json`, {
    encoding: 'utf8',
  })

  try {
    const result = JSON.parse(stdout) as unknown
    if (typeof result !== 'object' || result === null) {
      throw new Error('Az tool output is not a valid object')
    }
    if (!('accessToken' in result) || typeof result.accessToken !== 'string') {
      throw new Error('No access token found in az tool output')
    }
    core.setSecret(result.accessToken)
    return result.accessToken
  } catch (error) {
    core.error(`Error acquiring token from az tool`)
    core.debug(`az tool output: ${stdout}`)
    core.debug(`az tool stderr: ${stderr}`)
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`Error parsing az tool output: ${errorMessage}. ${stderr}`, { cause: error })
  }
}

export async function getTokenFromDirectAssertion(tenantId: string, clientId: string): Promise<string> {
  const cred = new ClientAssertionCredential(tenantId, clientId, async () =>
    core.getIDToken(core.getInput('audience', { required: true })),
  )
  const { token } = await cred.getToken(SCOPE)
  core.setSecret(token)
  return token
}

async function acquireToken(): Promise<string> {
  const tenantId = core.getInput('tenant-id')
  const clientId = core.getInput('client-id')

  if (tenantId && clientId) {
    core.debug('Getting token using direct client assertion method')
    return getTokenFromDirectAssertion(tenantId, clientId)
  } else {
    core.debug('Getting token using az tool method')
    return getTokenFromAzTool()
  }
}

export async function getTokenFromAz(): Promise<string> {
  const token = await acquireToken()
  core.setOutput('token', token)
  return token
}
