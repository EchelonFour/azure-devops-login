import { exec } from 'node:child_process'
import { promisify } from 'node:util'

import * as core from '@actions/core'

const execAsync = promisify(exec)

export async function installProviderIfNeeded(): Promise<void> {
  const installProviderInput = core.getBooleanInput('install-provider')

  if (!installProviderInput) {
    core.debug('Skipping provider installation as per input setting')
    return
  }
  const installCommand =
    process.platform === 'linux'
      ? 'sh -c "$(curl -fsSL https://aka.ms/install-artifacts-credprovider.sh)"'
      : 'iex "& { $(irm https://aka.ms/install-artifacts-credprovider.ps1) }"'
  try {
    const results = await execAsync(installCommand, {
      shell: process.platform === 'linux' ? '/bin/bash' : 'powershell.exe',
    })
    core.debug(`Provider installation stdout: ${results.stdout}`)
    core.debug(`Provider installation stderr: ${results.stderr}`)
    core.info('Azure Artifacts Credential Provider installed')
  } catch (error) {
    core.error(
      `Failed to install Azure Artifacts Credential Provider: ${
        error instanceof Error ? error.message : String(error)
      }`,
    )
    throw error
  }
}
