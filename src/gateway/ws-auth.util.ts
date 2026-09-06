import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

export function extractToken(client: Socket): string | null {
  const authToken = client.handshake.auth?.token as string | undefined;
  if (authToken) return authToken.replace('Bearer ', '');

  const header = client.handshake.headers?.authorization;
  if (header) return header.replace('Bearer ', '');

  return null;
}

export async function verifySocketToken(
  jwt: JwtService,
  client: Socket,
  secret: string,
): Promise<JwtPayload | null> {
  const token = extractToken(client);
  if (!token) return null;
  try {
    return await jwt.verifyAsync<JwtPayload>(token, { secret });
  } catch {
    return null;
  }
}
