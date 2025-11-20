import type * as identity from '@azure/identity'
import { jest } from '@jest/globals'

export const mockGetToken = jest
  .fn<identity.ClientAssertionCredential['getToken']>()
  .mockImplementation(async () => ({ token: 'mock-token' } as unknown as identity.AccessToken))

// eslint-disable-next-line @typescript-eslint/naming-convention
export const ClientAssertionCredential = jest
  .fn<
    (
      tenantId: string,
      clientId: string,
      getAssertion: () => Promise<string>,
      options?: identity.ClientAssertionCredentialOptions,
    ) => identity.ClientAssertionCredential
  >()
  .mockImplementation(
    (_tenantId, _clientId, getAssertion) =>
      ({
        getToken: async (scopes: string[] | string, tokenOptions?: identity.GetTokenOptions) => {
          await getAssertion()
          return mockGetToken(scopes, tokenOptions)
        },
      } as unknown as identity.ClientAssertionCredential),
  )
