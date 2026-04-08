import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { hashSync } from 'bcryptjs';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const prisma = {
    user: {
      findUnique: jest.fn(),
    },
  } as any;
  const jwtService = { signAsync: jest.fn().mockResolvedValue('token') } as unknown as JwtService;
  const service = new AuthService(prisma, jwtService);

  beforeEach(() => jest.clearAllMocks());

  it('logs in an active user with valid password', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'user@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: 'IT_ADMIN',
      locale: 'en',
      isActive: true,
      passwordHash: hashSync('ChangeMe123!', 12),
    });

    const result = await service.login('user@example.com', 'ChangeMe123!');
    expect(result.token).toBe('token');
    expect(result.user.email).toBe('user@example.com');
  });

  it('rejects invalid credentials', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(service.login('bad@example.com', 'nope')).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
