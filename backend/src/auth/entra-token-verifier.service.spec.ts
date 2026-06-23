import { ConfigService } from '@nestjs/config';
import { EntraTokenVerifier } from './entra-token-verifier.service';

jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn(),
  decodeJwt: jest.fn(() => {
    throw new Error('invalid token');
  }),
  jwtVerify: jest.fn(),
}));

function createVerifier(config: Record<string, string>): EntraTokenVerifier {
  return new EntraTokenVerifier({
    get: (key: string) => config[key],
  } as ConfigService);
}

describe('EntraTokenVerifier configuration', () => {
  it('derives the API audience from the canonical backend client id', () => {
    const verifier = createVerifier({
      ENTRA_TENANT_ID: 'tenant-id',
      ENTRA_CLIENT_ID: 'client-id',
    });

    const detail = verifier.buildTokenValidationDetail(
      'not-a-jwt',
      new Error('invalid token'),
    );

    expect(detail).toContain('Expected audience: client-id or api://client-id');
  });

  it('requires the canonical backend tenant and client id', async () => {
    const verifier = createVerifier({});

    await expect(verifier.verify('not-a-jwt')).rejects.toThrow(
      'Set ENTRA_TENANT_ID and ENTRA_CLIENT_ID on the backend',
    );
  });
});
