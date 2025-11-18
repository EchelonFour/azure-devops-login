import { parseNpmrcForADOFeeds } from './npmrc-parse.js'

describe('parseNpmrcForADOFeeds', () => {
  it('should parse Visual Studio ADO feed URLs', () => {
    const npmrcContent = `
@scope:registry=https://myorg.pkgs.visualstudio.com/_packaging/myfeed/npm/registry/
`
    const result = parseNpmrcForADOFeeds(npmrcContent)
    expect(result).toEqual(['https://myorg.pkgs.visualstudio.com/_packaging/myfeed/nuget/v3/index.json'])
  })

  it('should parse Azure DevOps ADO feed URLs', () => {
    const npmrcContent = `
@scope:registry=https://pkgs.dev.azure.com/myorg/_packaging/myfeed/npm/registry/
`
    const result = parseNpmrcForADOFeeds(npmrcContent)
    expect(result).toEqual(['https://pkgs.dev.azure.com/myorg/_packaging/myfeed/nuget/v3/index.json'])
  })

  it('should parse multiple ADO feeds', () => {
    const npmrcContent = `
@scope1:registry=https://org1.pkgs.visualstudio.com/_packaging/feed1/npm/registry/
@scope2:registry=https://pkgs.dev.azure.com/org2/_packaging/feed2/npm/registry/
`
    const result = parseNpmrcForADOFeeds(npmrcContent)
    expect(result).toEqual([
      'https://org1.pkgs.visualstudio.com/_packaging/feed1/nuget/v3/index.json',
      'https://pkgs.dev.azure.com/org2/_packaging/feed2/nuget/v3/index.json',
    ])
  })

  it('should filter out keys not ending with registry', () => {
    const npmrcContent = `
@scope:registry=https://myorg.pkgs.visualstudio.com/_packaging/myfeed/npm/registry/
@scope:token=sometoken
registry=https://registry.npmjs.org/
`
    const result = parseNpmrcForADOFeeds(npmrcContent)
    expect(result).toEqual(['https://myorg.pkgs.visualstudio.com/_packaging/myfeed/nuget/v3/index.json'])
  })

  it('should filter out non-ADO URLs', () => {
    const npmrcContent = `
@scope1:registry=https://myorg.pkgs.visualstudio.com/_packaging/myfeed/npm/registry/
@scope2:registry=https://registry.npmjs.org/
@scope3:registry=https://npm.pkg.github.com/
`
    const result = parseNpmrcForADOFeeds(npmrcContent)
    expect(result).toEqual(['https://myorg.pkgs.visualstudio.com/_packaging/myfeed/nuget/v3/index.json'])
  })

  it('should filter out URLs without /npm/registry/ path', () => {
    const npmrcContent = `
@scope1:registry=https://myorg.pkgs.visualstudio.com/_packaging/myfeed/npm/registry/
@scope2:registry=https://myorg.pkgs.visualstudio.com/_packaging/myfeed/
`
    const result = parseNpmrcForADOFeeds(npmrcContent)
    expect(result).toEqual(['https://myorg.pkgs.visualstudio.com/_packaging/myfeed/nuget/v3/index.json'])
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
    expect(result).toEqual(['https://myorg.pkgs.visualstudio.com/_packaging/myfeed/nuget/v3/index.json'])
  })
})
