import { getIronSession, SessionOptions } from 'iron-session';
import { cookies } from 'next/headers';

export interface ResellerSession {
  customerId: string;
  email: string;
  name: string;
  discountRate: number;
  accessCode: string;
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET ?? 'fallback-secret-change-in-production',
  cookieName: 'reseller_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<ResellerSession>(cookieStore, sessionOptions);
}
