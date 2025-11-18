import { jest } from '@jest/globals'

import * as core from '../__fixtures__/core.js'

jest.unstable_mockModule('@actions/core', () => core)

const { loadExistingCredentials, ENV_VAR_NAME } = await import('./vss-credentials.js')

describe('loadExistingCredentials', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetAllMocks()
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('should return empty credentials when env var is not set', () => {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete process.env[ENV_VAR_NAME]

    const result = loadExistingCredentials()

    expect(result).toEqual({ endpointCredentials: [] })
  })

  it('should return valid credentials when properly formatted', () => {
    const validCredentials = {
      endpointCredentials: [{ endpoint: 'https://test.com', password: 'pass123' }],
    }
    process.env[ENV_VAR_NAME] = JSON.stringify(validCredentials)

    const result = loadExistingCredentials()

    expect(result).toEqual(validCredentials)
  })

  it('should return empty and log error when JSON is invalid', () => {
    process.env[ENV_VAR_NAME] = 'invalid json'

    const result = loadExistingCredentials()

    expect(result).toEqual({ endpointCredentials: [] })
  })

  it('should throw error when parsed value is not an object', () => {
    process.env[ENV_VAR_NAME] = JSON.stringify('string')

    const result = loadExistingCredentials()

    expect(result).toEqual({ endpointCredentials: [] })
  })

  it('should throw error when endpointCredentials is missing', () => {
    process.env[ENV_VAR_NAME] = JSON.stringify({ other: 'field' })

    const result = loadExistingCredentials()

    expect(result).toEqual({ endpointCredentials: [] })
  })

  it('should throw error when endpointCredentials is not an array', () => {
    process.env[ENV_VAR_NAME] = JSON.stringify({ endpointCredentials: 'not array' })

    const result = loadExistingCredentials()

    expect(result).toEqual({ endpointCredentials: [] })
  })

  it('should throw error when endpoint item is not an object', () => {
    process.env[ENV_VAR_NAME] = JSON.stringify({ endpointCredentials: ['string'] })

    const result = loadExistingCredentials()

    expect(result).toEqual({ endpointCredentials: [] })
  })

  it('should throw error when endpoint item is null', () => {
    process.env[ENV_VAR_NAME] = JSON.stringify({ endpointCredentials: [null] })

    const result = loadExistingCredentials()

    expect(result).toEqual({ endpointCredentials: [] })
  })

  it('should throw error when endpoint item lacks endpoint property', () => {
    process.env[ENV_VAR_NAME] = JSON.stringify({ endpointCredentials: [{ password: 'pass' }] })

    const result = loadExistingCredentials()

    expect(result).toEqual({ endpointCredentials: [] })
  })

  it('should throw error when endpoint property is not a string', () => {
    process.env[ENV_VAR_NAME] = JSON.stringify({ endpointCredentials: [{ endpoint: 123, password: 'pass' }] })

    const result = loadExistingCredentials()

    expect(result).toEqual({ endpointCredentials: [] })
  })
})
