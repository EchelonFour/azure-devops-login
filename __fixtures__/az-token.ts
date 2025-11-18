import { jest } from '@jest/globals'

import type { getTokenFromAzTool as getTokenFromAzToolType } from '../src/az-token.js'

export const getTokenFromAzTool = jest.fn<typeof getTokenFromAzToolType>()
