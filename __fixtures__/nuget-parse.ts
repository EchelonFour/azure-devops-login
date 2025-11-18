import { jest } from '@jest/globals'

import type { parseNugetForADOFeeds as parseNugetForADOFeedsType } from '../src/nuget-parse.js'

export const parseNugetForADOFeeds = jest.fn<typeof parseNugetForADOFeedsType>()
