import { readFile, stat } from 'node:fs/promises'

import { jest } from '@jest/globals'
import mockFs from 'mock-fs'

import * as core from '../__fixtures__/core.js'

jest.unstable_mockModule('@actions/core', () => core)

const { buildUserNugetContent, parseNugetForADOFeeds } = await import('./nuget-parse.js')

function buildFile(feedUrl: string, extra = ''): string {
  return `
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <packageSources>
    <clear />
    <add key="nuget-feed" value="${feedUrl}" />
    ${extra}
  </packageSources>
</configuration>
`
}

describe('parseNugetForADOFeeds', () => {
  it('should parse Azure DevOps ADO feed URLs', () => {
    const nugetContent = buildFile('https://pkgs.dev.azure.com/organisation/_packaging/nuget-feed/nuget/v3/index.json')
    const result = parseNugetForADOFeeds(nugetContent)
    expect(result).toEqual([
      {
        nugetUrl: 'https://pkgs.dev.azure.com/organisation/_packaging/nuget-feed/nuget/v3/index.json',
        sourceName: 'nuget-feed',
      },
    ])
  })
  it('should return empty array for nuget.config without ADO feeds', () => {
    const nugetContent = buildFile('https://api.nuget.org/v3/index.json')
    const result = parseNugetForADOFeeds(nugetContent)
    expect(result).toEqual([])
  })
  it('should parse Visual Studio ADO feed URLs', () => {
    const nugetContent = buildFile(
      'https://organisation.pkgs.visualstudio.com/_packaging/nuget-feed/nuget/v3/index.json',
    )
    const result = parseNugetForADOFeeds(nugetContent)
    expect(result).toEqual([
      {
        nugetUrl: 'https://organisation.pkgs.visualstudio.com/_packaging/nuget-feed/nuget/v3/index.json',
        sourceName: 'nuget-feed',
      },
    ])
  })
  it('should parse multiple ADO feeds', () => {
    const nugetContent = buildFile(
      'https://organisation.pkgs.visualstudio.com/_packaging/nuget-feed1/nuget/v3/index.json',
      `<add key="another-feed" value="https://pkgs.dev.azure.com/organisation/_packaging/nuget-feed2/nuget/v3/index.json" />`,
    )
    const result = parseNugetForADOFeeds(nugetContent)
    expect(result).toEqual([
      {
        nugetUrl: 'https://organisation.pkgs.visualstudio.com/_packaging/nuget-feed1/nuget/v3/index.json',
        sourceName: 'nuget-feed',
      },
      {
        nugetUrl: 'https://pkgs.dev.azure.com/organisation/_packaging/nuget-feed2/nuget/v3/index.json',
        sourceName: 'another-feed',
      },
    ])
  })
  it('should return empty array for empty nuget.config content', () => {
    const nugetContent = ``
    const result = parseNugetForADOFeeds(nugetContent)
    expect(result).toEqual([])
  })
  it('should handle file with no new sources in it', () => {
    const nugetContent = `
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <packageSources>
    <clear />
  </packageSources>
</configuration>
`
    const result = parseNugetForADOFeeds(nugetContent)
    expect(result).toEqual([])
  })
})

describe('buildUserNugetContent', () => {
  beforeEach(() => {
    process.env.GITHUB_WORKSPACE = '/home/runner/workspace/workspace'
    core.getBooleanInput.mockReturnValue(true)
    mockFs.restore()
  })
  afterEach(() => {
    delete process.env.GITHUB_WORKSPACE
    mockFs.restore()
  })
  it('should build nuget.config content with given feed and push URLs', async () => {
    mockFs({})
    const token = 'sometoken'
    const feedUrl = 'https://example.pkgs.visualstudio.com/nuget/v3/index.json'
    await buildUserNugetContent(
      [
        {
          nugetUrl: feedUrl,
          sourceName: 'nuget-feed',
        },
      ],
      token,
    )
    const result = await readFile('/home/runner/workspace/nuget.config', 'utf-8')
    mockFs.restore()
    expect(result).toMatchInlineSnapshot(`
     "<?xml version="1.0" encoding="utf-8"?>
     <configuration>
       <packageSourceCredentials>
         <nuget-feed>
           <add key="Username" value="VssSessionToken"/>
           <add key="ClearTextPassword" value="sometoken"/>
         </nuget-feed>
       </packageSourceCredentials>
     </configuration>"
    `)
    expect(core.setOutput).toHaveBeenCalledWith('nuget-credential-file', '/home/runner/workspace/nuget.config')
  })
  it('should merge with existing nuget.config content', async () => {
    mockFs({
      '/home/runner/workspace/nuget.config': `
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <packageSources>
    <clear />
    <add key="existing-feed" value="https://existing.feed/nuget/v3/index.json" />
  </packageSources>
  <packageSourceCredentials>
    <existing-feed>
      <add key="Username" value="olduser"/>
      <add key="ClearTextPassword" value="oldtoken"/>
    </existing-feed>
  </packageSourceCredentials>
</configuration>
`,
    })
    const token = 'newtoken'
    const feedUrl = 'https://example.pkgs.visualstudio.com/nuget/v3/index.json'
    await buildUserNugetContent(
      [
        {
          nugetUrl: feedUrl,
          sourceName: 'nuget-feed',
        },
      ],
      token,
    )
    const result = await readFile('/home/runner/workspace/nuget.config', 'utf-8')
    mockFs.restore()
    expect(result).toMatchInlineSnapshot(`
     "<?xml version="1.0" encoding="utf-8"?>
     <configuration>
       <packageSources>
         <clear/>
         <add key="existing-feed" value="https://existing.feed/nuget/v3/index.json"/>
       </packageSources>
       <packageSourceCredentials>
         <existing-feed>
           <add key="Username" value="olduser"/>
           <add key="ClearTextPassword" value="oldtoken"/>
         </existing-feed>
         <nuget-feed>
           <add key="Username" value="VssSessionToken"/>
           <add key="ClearTextPassword" value="newtoken"/>
         </nuget-feed>
       </packageSourceCredentials>
     </configuration>"
    `)
    expect(core.setOutput).toHaveBeenCalledWith('nuget-credential-file', '/home/runner/workspace/nuget.config')
  })
  it('should skip writing nuget.config if no feeds are provided', async () => {
    mockFs({})
    await buildUserNugetContent([], 'sometoken')
    const fileExists = await stat('/home/runner/workspace/nuget.config')
      .then(() => true)
      .catch(() => false)
    mockFs.restore()
    expect(fileExists).toBe(false)
    expect(core.setOutput).not.toHaveBeenCalled()
  })
  it('should skip writing nuget.config if input is false', async () => {
    mockFs({})
    core.getBooleanInput.mockReturnValue(false)
    await buildUserNugetContent(
      [
        {
          nugetUrl: 'https://example.pkgs.visualstudio.com/nuget/v3/index.json',
          sourceName: 'nuget-feed',
        },
      ],
      'sometoken',
    )
    const fileExists = await stat('/home/runner/workspace/nuget.config')
      .then(() => true)
      .catch(() => false)
    mockFs.restore()
    expect(fileExists).toBe(false)
    expect(core.setOutput).not.toHaveBeenCalled()
  })
})
