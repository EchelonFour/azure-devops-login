import { jest } from '@jest/globals'

import * as core from '../__fixtures__/core.js'

jest.unstable_mockModule('@actions/core', () => core)

const { loadExistingCredentials, setVssCredentials } = await import('./vss-credentials.js')

describe('loadExistingCredentials', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    delete process.env.VSS_NUGET_EXTERNAL_FEED_ENDPOINTS
  })

  afterAll(() => {
    delete process.env.VSS_NUGET_EXTERNAL_FEED_ENDPOINTS
  })

  it('should return empty credentials when env var is not set', () => {
    delete process.env.VSS_NUGET_EXTERNAL_FEED_ENDPOINTS

    const result = loadExistingCredentials()

    expect(result).toEqual({ endpointCredentials: [] })
  })

  it('should return valid credentials when properly formatted', () => {
    const validCredentials = {
      endpointCredentials: [{ endpoint: 'https://test.com', password: 'pass123' }],
    }
    process.env.VSS_NUGET_EXTERNAL_FEED_ENDPOINTS = JSON.stringify(validCredentials)
    const result = loadExistingCredentials()

    expect(result).toEqual(validCredentials)
  })

  it('should return empty and log error when JSON is invalid', () => {
    process.env.VSS_NUGET_EXTERNAL_FEED_ENDPOINTS = 'invalid json'

    const result = loadExistingCredentials()

    expect(result).toEqual({ endpointCredentials: [] })
  })

  it('should throw error when parsed value is not an object', () => {
    process.env.VSS_NUGET_EXTERNAL_FEED_ENDPOINTS = JSON.stringify('string')

    const result = loadExistingCredentials()

    expect(result).toEqual({ endpointCredentials: [] })
  })

  it('should throw error when endpointCredentials is missing', () => {
    process.env.VSS_NUGET_EXTERNAL_FEED_ENDPOINTS = JSON.stringify({ other: 'field' })

    const result = loadExistingCredentials()

    expect(result).toEqual({ endpointCredentials: [] })
  })

  it('should throw error when endpointCredentials is not an array', () => {
    process.env.VSS_NUGET_EXTERNAL_FEED_ENDPOINTS = JSON.stringify({ endpointCredentials: 'not array' })

    const result = loadExistingCredentials()

    expect(result).toEqual({ endpointCredentials: [] })
  })

  it('should throw error when endpoint item is not an object', () => {
    process.env.VSS_NUGET_EXTERNAL_FEED_ENDPOINTS = JSON.stringify({ endpointCredentials: ['string'] })

    const result = loadExistingCredentials()

    expect(result).toEqual({ endpointCredentials: [] })
  })

  it('should throw error when endpoint item is null', () => {
    process.env.VSS_NUGET_EXTERNAL_FEED_ENDPOINTS = JSON.stringify({ endpointCredentials: [null] })

    const result = loadExistingCredentials()

    expect(result).toEqual({ endpointCredentials: [] })
  })

  it('should throw error when endpoint item lacks endpoint property', () => {
    process.env.VSS_NUGET_EXTERNAL_FEED_ENDPOINTS = JSON.stringify({ endpointCredentials: [{ password: 'pass' }] })

    const result = loadExistingCredentials()

    expect(result).toEqual({ endpointCredentials: [] })
  })

  it('should throw error when endpoint property is not a string', () => {
    process.env.VSS_NUGET_EXTERNAL_FEED_ENDPOINTS = JSON.stringify({
      endpointCredentials: [{ endpoint: 123, password: 'pass' }],
    })

    const result = loadExistingCredentials()

    expect(result).toEqual({ endpointCredentials: [] })
  })
})
describe('setVssCredentials', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    delete process.env.VSS_NUGET_EXTERNAL_FEED_ENDPOINTS
  })
  afterAll(() => {
    delete process.env.VSS_NUGET_EXTERNAL_FEED_ENDPOINTS
  })

  it('should add new credentials when no existing credentials', () => {
    const urls = ['https://test.com', 'https://example.com']
    const token = 'test-token'

    setVssCredentials(urls, token)

    expect(core.exportVariable).toHaveBeenCalledWith(
      'VSS_NUGET_EXTERNAL_FEED_ENDPOINTS',
      JSON.stringify({
        endpointCredentials: [
          { endpoint: 'https://test.com', username: 'github', password: 'test-token' },
          { endpoint: 'https://example.com', username: 'github', password: 'test-token' },
        ],
      }),
    )
  })

  it('should add new credentials to existing ones', () => {
    const existingCredentials = {
      endpointCredentials: [{ endpoint: 'https://existing.com', password: 'existing-pass' }],
    }
    process.env.VSS_NUGET_EXTERNAL_FEED_ENDPOINTS = JSON.stringify(existingCredentials)
    const urls = ['https://new.com']
    const token = 'new-token'

    setVssCredentials(urls, token)

    expect(core.exportVariable).toHaveBeenCalledWith(
      'VSS_NUGET_EXTERNAL_FEED_ENDPOINTS',
      JSON.stringify({
        endpointCredentials: [
          { endpoint: 'https://existing.com', password: 'existing-pass' },
          { endpoint: 'https://new.com', username: 'github', password: 'new-token' },
        ],
      }),
    )
  })
})
