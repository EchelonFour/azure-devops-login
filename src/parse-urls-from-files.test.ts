import { jest } from '@jest/globals'
import * as core from '../__fixtures__/core.js'
import mockFs from 'mock-fs'

jest.unstable_mockModule('@actions/core', () => core)
jest.unstable_mockModule('./npmrc-parse.js', () => ({
  parseNpmrcForADOFeeds: jest.fn<typeof import('./npmrc-parse.js').parseNpmrcForADOFeeds>(),
}))
jest.unstable_mockModule('./nuget-parse.js', () => ({
  parseNugetForADOFeeds: jest.fn<typeof import('./nuget-parse.js').parseNugetForADOFeeds>(),
}))
const mockParseNpmrc = jest.mocked((await import('./npmrc-parse.js')).parseNpmrcForADOFeeds)
const mockParseNuget = jest.mocked((await import('./nuget-parse.js')).parseNugetForADOFeeds)

const { readUrlsFromFiles } = await import('./parse-urls-from-files.js')

describe('readUrlsFromFiles', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFs.restore()
  })
  afterEach(() => {
    mockFs.restore()
  })

  it('should return empty array when no files are provided', async () => {
    const result = await readUrlsFromFiles([], [])
    expect(result).toEqual([])
  })

  it('should process npmrc files and return URLs', async () => {
    mockFs({
      '.npmrc': 'contents',
      'package.json': '{}',
    })

    mockParseNpmrc.mockReturnValue(['https://example.pkgs.visualstudio.com/'])

    const result = await readUrlsFromFiles(['.npmrc'], [])

    mockFs.restore()

    expect(result).toEqual(['https://example.pkgs.visualstudio.com/'])
    expect(mockParseNpmrc).toHaveBeenCalledWith('contents')
  })

  it('should process nuget files and return URLs', async () => {
    mockFs({
      'nuget.config': 'contents',
    })
    mockParseNuget.mockReturnValue(['https://example.pkgs.visualstudio.com/nuget/'])

    const result = await readUrlsFromFiles([], ['nuget.config'])

    mockFs.restore()

    expect(result).toEqual(['https://example.pkgs.visualstudio.com/nuget/'])
    expect(mockParseNuget).toHaveBeenCalledWith('contents')
  })

  it('should flatten multiple URLs from multiple files', async () => {
    mockFs({
      '.npmrc': 'content',
      'other/.npmrc': 'content other',
    })
    mockParseNpmrc.mockReturnValueOnce(['https://url1.com/', 'https://url2.com/'])
    mockParseNpmrc.mockReturnValueOnce(['https://url2.com/', 'https://url3.com/'])

    const result = await readUrlsFromFiles(['.npmrc', 'other/.npmrc'], [])

    mockFs.restore()

    expect(result).toEqual(['https://url1.com/', 'https://url2.com/', 'https://url3.com/'])
    expect(mockParseNpmrc).toHaveBeenCalledTimes(2)
    expect(mockParseNpmrc).toHaveBeenNthCalledWith(1, 'content')
    expect(mockParseNpmrc).toHaveBeenNthCalledWith(2, 'content other')
  })

  it('should handle file not found gracefully', async () => {
    mockFs({})

    const result = await readUrlsFromFiles(['.npmrc'], [])

    mockFs.restore()

    expect(result).toEqual([])
    expect(mockParseNpmrc).not.toHaveBeenCalled()
  })

  it('should handle file read errors gracefully', async () => {
    mockFs({
      '.npmrc': mockFs.file({ mode: 0o000, content: 'content' }),
    })

    const result = await readUrlsFromFiles(['.npmrc'], [])

    mockFs.restore()

    expect(result).toEqual([])
    expect(mockParseNpmrc).not.toHaveBeenCalled()
  })

  it('should handle file names case insensitively', async () => {
    mockFs({
      'NuGet.Config': 'nuget content',
    })
    mockParseNuget.mockReturnValue(['https://caseinsensitive.pkgs.visualstudio.com/nuget/'])

    const result = await readUrlsFromFiles([], ['nuget.config'])

    mockFs.restore()

    expect(result).toEqual(['https://caseinsensitive.pkgs.visualstudio.com/nuget/'])
    expect(mockParseNuget).toHaveBeenCalledWith('nuget content')
  })
})
