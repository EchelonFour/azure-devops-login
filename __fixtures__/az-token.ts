import { jest } from '@jest/globals'

export const getTokenFromAzTool = jest.fn<typeof import('../src/az-token.js').getTokenFromAzTool>()
