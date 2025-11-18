import { jest } from '@jest/globals'

import type { parseNpmrcForADOFeeds as parseNpmrcForADOFeedsType } from '../src/npmrc-parse.js'

export const parseNpmrcForADOFeeds = jest.fn<typeof parseNpmrcForADOFeedsType>()
