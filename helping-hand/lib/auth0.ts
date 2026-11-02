import { Auth0Client } from '@auth0/nextjs-auth0/server';

const rawDomain =
  process.env.AUTH0_DOMAIN ||
  process.env.AUTH0_ISSUER_BASE_URL ||
  '';

// Clean domain of any https:// or trailing slashes
const domain = rawDomain.replace(/^https?:\/\//, '').replace(/\/$/, '') || 'dev-demo.auth0.com';

const appBaseUrl =
  process.env.APP_BASE_URL ||
  process.env.AUTH0_BASE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  'http://localhost:3000';

export const auth0 = new Auth0Client({
  domain,
  clientId: process.env.AUTH0_CLIENT_ID || 'client-id-demo',
  clientSecret: process.env.AUTH0_CLIENT_SECRET || 'client-secret-demo',
  secret: process.env.AUTH0_SECRET || 'dev_secret_must_be_at_least_32_characters_long_1234',
  appBaseUrl,
});

/**
 * Returns the authenticated Auth0 user ID (sub).
 * If the user is not signed in or is testing locally, defaults to 'demo-user-local'
 * so goal creation and fetching work seamlessly without blocking testing.
 */
export async function getCurrentUserId(): Promise<string> {
  try {
    const session = await auth0.getSession();
    if (session?.user?.sub) {
      return session.user.sub;
    }
  } catch (err) {
    console.warn('Auth0 getSession warning:', err);
  }

  // Fallback to local demo user for testing
  return 'demo-user-local';
}
