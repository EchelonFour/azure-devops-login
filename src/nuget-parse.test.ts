import { parseNugetForADOFeeds } from './nuget-parse.js'

function buildFile(feedUrl: string, pushUrl?: string, extra = ''): string {
  return `
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <packageSources>
    <clear />
    <add key="nuget-feed" value="${feedUrl}" />
    ${extra}
  </packageSources>
  <config>
    <add key="defaultPushSource" value="${pushUrl ?? feedUrl}" />
  </config>
</configuration>
`
}

describe('parseNugetForADOFeeds', () => {
  it('should parse Azure DevOps ADO feed URLs', () => {
    const nugetContent = buildFile('https://pkgs.dev.azure.com/organisation/_packaging/nuget-feed/nuget/v3/index.json')
    const result = parseNugetForADOFeeds(nugetContent)
    expect(result).toEqual(['https://pkgs.dev.azure.com/organisation/_packaging/nuget-feed/nuget/v3/index.json'])
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
    expect(result).toEqual(['https://organisation.pkgs.visualstudio.com/_packaging/nuget-feed/nuget/v3/index.json'])
  })
  it('should parse multiple ADO feeds', () => {
    const nugetContent = buildFile(
      'https://organisation.pkgs.visualstudio.com/_packaging/nuget-feed1/nuget/v3/index.json',
      undefined,
      `<add key="another-feed" value="https://pkgs.dev.azure.com/organisation/_packaging/nuget-feed2/nuget/v3/index.json" />`,
    )
    const result = parseNugetForADOFeeds(nugetContent)
    expect(result).toEqual([
      'https://organisation.pkgs.visualstudio.com/_packaging/nuget-feed1/nuget/v3/index.json',
      'https://pkgs.dev.azure.com/organisation/_packaging/nuget-feed2/nuget/v3/index.json',
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
