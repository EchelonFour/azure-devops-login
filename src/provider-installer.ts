import { exec } from 'node:child_process'
import { promisify } from 'node:util'

import * as core from '@actions/core'

const execAsync = promisify(exec)

export async function installProvider(): Promise<void> {
  const installCommand =
    process.platform === 'win32'
      ? 'iex "& { $(irm https://aka.ms/install-artifacts-credprovider.ps1) }"'
      : 'sh -c "$(curl -fsSL https://aka.ms/install-artifacts-credprovider.sh)"'

  try {
    const results = await execAsync(installCommand, { encoding: 'utf8' })
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
