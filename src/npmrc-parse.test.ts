import { readFile, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { jest } from '@jest/globals'
import mockFs from 'mock-fs'

import * as core from '../__fixtures__/core.js'

import type { NpmrcAdoFeed } from './npmrc-parse.js'

jest.unstable_mockModule('@actions/core', () => core)

const { parseNpmrcForADOFeeds, buildUserNpmrcContent } = await import('./npmrc-parse.js')

describe('parseNpmrcForADOFeeds', () => {
  it('should parse Visual Studio ADO feed URLs', () => {
    const npmrcContent = `
@scope:registry=https://myorg.pkgs.visualstudio.com/_packaging/myfeed/npm/registry/
`
    const result = parseNpmrcForADOFeeds(npmrcContent)
    expect(result).toEqual([
      {
        nugetUrl: 'https://myorg.pkgs.visualstudio.com/_packaging/myfeed/nuget/v3/index.json',
        npmUrl: 'https://myorg.pkgs.visualstudio.com/_packaging/myfeed/npm/registry/',
      },
    ])
  })

  it('should parse Azure DevOps ADO feed URLs', () => {
    const npmrcContent = `
@scope:registry=https://pkgs.dev.azure.com/myorg/_packaging/myfeed/npm/registry/
`
    const result = parseNpmrcForADOFeeds(npmrcContent)
    expect(result).toEqual([
      {
        nugetUrl: 'https://pkgs.dev.azure.com/myorg/_packaging/myfeed/nuget/v3/index.json',
        npmUrl: 'https://pkgs.dev.azure.com/myorg/_packaging/myfeed/npm/registry/',
      },
    ])
  })

  it('should parse multiple ADO feeds', () => {
    const npmrcContent = `
@scope1:registry=https://org1.pkgs.visualstudio.com/_packaging/feed1/npm/registry/
@scope2:registry=https://pkgs.dev.azure.com/org2/_packaging/feed2/npm/registry/
`
    const result = parseNpmrcForADOFeeds(npmrcContent)
    expect(result).toEqual([
      {
        nugetUrl: 'https://org1.pkgs.visualstudio.com/_packaging/feed1/nuget/v3/index.json',
        npmUrl: 'https://org1.pkgs.visualstudio.com/_packaging/feed1/npm/registry/',
      },
      {
        nugetUrl: 'https://pkgs.dev.azure.com/org2/_packaging/feed2/nuget/v3/index.json',
        npmUrl: 'https://pkgs.dev.azure.com/org2/_packaging/feed2/npm/registry/',
      },
    ])
  })

  it('should filter out keys not ending with registry', () => {
    const npmrcContent = `
@scope:registry=https://myorg.pkgs.visualstudio.com/_packaging/myfeed/npm/registry/
@scope:token=sometoken
registry=https://registry.npmjs.org/
`
    const result = parseNpmrcForADOFeeds(npmrcContent)
    expect(result).toEqual([
      {
        nugetUrl: 'https://myorg.pkgs.visualstudio.com/_packaging/myfeed/nuget/v3/index.json',
        npmUrl: 'https://myorg.pkgs.visualstudio.com/_packaging/myfeed/npm/registry/',
      },
    ])
  })

  it('should filter out non-ADO URLs', () => {
    const npmrcContent = `
@scope1:registry=https://myorg.pkgs.visualstudio.com/_packaging/myfeed/npm/registry/
@scope2:registry=https://registry.npmjs.org/
@scope3:registry=https://npm.pkg.github.com/
`
    const result = parseNpmrcForADOFeeds(npmrcContent)
    expect(result).toEqual([
      {
        nugetUrl: 'https://myorg.pkgs.visualstudio.com/_packaging/myfeed/nuget/v3/index.json',
        npmUrl: 'https://myorg.pkgs.visualstudio.com/_packaging/myfeed/npm/registry/',
      },
    ])
  })

  it('should filter out URLs without /npm/registry/ path', () => {
    const npmrcContent = `
@scope1:registry=https://myorg.pkgs.visualstudio.com/_packaging/myfeed/npm/registry/
@scope2:registry=https://myorg.pkgs.visualstudio.com/_packaging/myfeed/
`
    const result = parseNpmrcForADOFeeds(npmrcContent)
    expect(result).toEqual([
      {
        nugetUrl: 'https://myorg.pkgs.visualstudio.com/_packaging/myfeed/nuget/v3/index.json',
        npmUrl: 'https://myorg.pkgs.visualstudio.com/_packaging/myfeed/npm/registry/',
      },
    ])
  })

  it('should return empty array for empty npmrc content', () => {
    const result = parseNpmrcForADOFeeds('')
    expect(result).toEqual([])
  })

  it('should handle malformed npmrc content gracefully', () => {
    const npmrcContent = 'invalid content without proper format'
    const result = parseNpmrcForADOFeeds(npmrcContent)
    expect(result).toEqual([])
  })

  it('should return unique feed URLs', () => {
    const npmrcContent = `
@scope1:registry=https://myorg.pkgs.visualstudio.com/_packaging/myfeed/npm/registry/
@scope2:registry=https://myorg.pkgs.visualstudio.com/_packaging/myfeed/npm/registry/
`
    const result = parseNpmrcForADOFeeds(npmrcContent)
    expect(result).toEqual([
      {
        nugetUrl: 'https://myorg.pkgs.visualstudio.com/_packaging/myfeed/nuget/v3/index.json',
        npmUrl: 'https://myorg.pkgs.visualstudio.com/_packaging/myfeed/npm/registry/',
      },
    ])
  })
})
describe('buildUserNpmrcContent', () => {
  const mockFeeds: NpmrcAdoFeed[] = [
    {
      npmUrl: 'https://pkgs.dev.azure.com/myorg/_packaging/myfeed/npm/registry/',
      nugetUrl: 'https://pkgs.dev.azure.com/myorg/_packaging/myfeed/nuget/v3/index.json',
    },
  ]
  const mockToken = 'test-token'
  const tmpNpmrcLocation = path.resolve(tmpdir(), '.npmrc')

  beforeEach(() => {
    jest.clearAllMocks()
    delete process.env.NPM_CONFIG_USERCONFIG
    process.env.RUNNER_TEMP = tmpdir()
    mockFs.restore()
    core.getBooleanInput.mockReturnValue(true)
  })
  afterEach(() => {
    delete process.env.NPM_CONFIG_USERCONFIG
    delete process.env.RUNNER_TEMP
    mockFs.restore()
  })

  it('should skip when no feeds provided', async () => {
    mockFs({})
    await buildUserNpmrcContent([], mockToken)
    expect(core.exportVariable).not.toHaveBeenCalled()
    const exists = await stat(tmpNpmrcLocation)
      .then(() => true)
      .catch(() => false)
    expect(exists).toBe(false)
    expect(core.setOutput).not.toHaveBeenCalled()
  })

  it('should skip when build-npmrc-credentials-file is false', async () => {
    mockFs({})
    core.getBooleanInput.mockReturnValue(false)
    await buildUserNpmrcContent(mockFeeds, mockToken)
    expect(core.exportVariable).not.toHaveBeenCalled()
    const exists = await stat(tmpNpmrcLocation)
      .then(() => true)
      .catch(() => false)
    expect(exists).toBe(false)
    expect(core.setOutput).not.toHaveBeenCalled()
  })

  it('should create new npmrc file when it does not exist', async () => {
    mockFs({})
    await buildUserNpmrcContent(mockFeeds, mockToken)
    expect(core.exportVariable).toHaveBeenCalledWith('NPM_CONFIG_USERCONFIG', tmpNpmrcLocation)
    const content = await readFile(tmpNpmrcLocation, 'utf-8')
    mockFs.restore()
    expect(content).toMatchInlineSnapshot(`
     "//pkgs.dev.azure.com/myorg/_packaging/myfeed/npm/registry/:_authToken=test-token
     "
    `)
    expect(core.setOutput).toHaveBeenCalledWith('npmrc-credential-file', tmpNpmrcLocation)
  })

  it('should merge with existing npmrc content', async () => {
    process.env.NPM_CONFIG_USERCONFIG = '/some/custom/.npmrc'
    mockFs({
      '/some/custom/.npmrc': `
@existing:registry=https://existing.registry/npm/registry/
//existing.registry/:_authToken=existing-token
`,
    })
    await buildUserNpmrcContent(mockFeeds, mockToken)
    expect(core.exportVariable).not.toHaveBeenCalled()
    const content = await readFile('/some/custom/.npmrc', 'utf-8')
    mockFs.restore()
    expect(content).toMatchInlineSnapshot(`
     "@existing:registry=https://existing.registry/npm/registry/
     //existing.registry/:_authToken=existing-token
     //pkgs.dev.azure.com/myorg/_packaging/myfeed/npm/registry/:_authToken=test-token
     "
    `)
    expect(core.setOutput).toHaveBeenCalledWith('npmrc-credential-file', '/some/custom/.npmrc')
  })

  it('should handle multiple feeds', async () => {
    const multipleFeeds: NpmrcAdoFeed[] = [
      ...mockFeeds,
      {
        npmUrl: 'https://myorg.pkgs.visualstudio.com/_packaging/anotherfeed/npm/registry/',
        nugetUrl: 'https://myorg.pkgs.visualstudio.com/_packaging/anotherfeed/nuget/v3/index.json',
      },
    ]
    mockFs({})
    await buildUserNpmrcContent(multipleFeeds, mockToken)
    expect(core.exportVariable).toHaveBeenCalledWith('NPM_CONFIG_USERCONFIG', tmpNpmrcLocation)
    const content = await readFile(tmpNpmrcLocation, 'utf-8')
    mockFs.restore()
    expect(content).toMatchInlineSnapshot(`
     "//pkgs.dev.azure.com/myorg/_packaging/myfeed/npm/registry/:_authToken=test-token
     //myorg.pkgs.visualstudio.com/_packaging/anotherfeed/npm/registry/:_authToken=test-token
     "
    `)
    expect(core.setOutput).toHaveBeenCalledWith('npmrc-credential-file', tmpNpmrcLocation)
  })
})
