import type * as childProcess from 'node:child_process'

import { jest } from '@jest/globals'

import * as core from '../__fixtures__/core.js'

jest.unstable_mockModule('@actions/core', () => core)
jest.unstable_mockModule('node:child_process', () => ({
  exec: jest.fn(),
}))

const { getTokenFromAzTool } = await import('./az-token.js')

const mockExec = jest.mocked((await import('node:child_process')).exec)

function buildMockExec(stdout: string): void {
  mockExec.mockImplementation(((command, options, callback) => {
    if (options?.encoding !== 'utf8') {
      throw new Error('Expected encoding to be utf8')
    }
    if (typeof callback !== 'function') {
      throw new Error('Expected callback to be a function')
    }
    const callbackRealType = callback as unknown as (
      error: Error | null,
      values: { stdout: string; stderr: string },
    ) => void
    callbackRealType(null, { stdout, stderr: '' })
  }) as typeof childProcess.exec)
}

describe('getTokenFromAzTool', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return access token when az tool returns valid JSON', async () => {
    const mockToken = 'mock-access-token'
    const mockOutput = JSON.stringify({ accessToken: mockToken })

    buildMockExec(mockOutput)

    const result = await getTokenFromAzTool()

    expect(result).toBe(mockToken)
    expect(core.setSecret).toHaveBeenCalledWith(mockToken)
  })

  it('should throw error when accessToken is missing from output', async () => {
    const mockOutput = JSON.stringify({ someOtherField: 'value' })

    buildMockExec(mockOutput)

    await expect(getTokenFromAzTool()).rejects.toThrow()
  })

  it('should throw error when JSON parsing fails', async () => {
    const invalidJson = 'invalid json'

    buildMockExec(invalidJson)

    await expect(getTokenFromAzTool()).rejects.toThrow()
  })
})
