import connectDB from './mongodb';
import User, { IUser } from './models/User';
import { auth0 } from './auth0';

export async function generateUniqueUsername(candidate: string): Promise<string> {
  let clean = candidate
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 18);

  if (clean.length < 3) {
    clean = `user_${Math.floor(1000 + Math.random() * 9000)}`;
  }

  let username = clean;
  let counter = 1;

  while (await User.exists({ username })) {
    const suffix = `${counter++}`;
    username = `${clean.slice(0, 20 - suffix.length)}_${suffix}`;
  }

  return username;
}

export async function getOrCreateCurrentUser(): Promise<IUser> {
  await connectDB();

  let auth0Id = 'demo-user-local';
  let email = 'demo@helpinghand.local';
  let name = 'Demo Adventurer';
  let picture = '';
  let nickname = 'demo_hero';

  try {
    const session = await auth0.getSession();
    if (session?.user?.sub) {
      auth0Id = session.user.sub;
      email = session.user.email || '';
      name = session.user.name || session.user.nickname || 'Adventurer';
      picture = session.user.picture || '';
      nickname = session.user.nickname || '';
    }
  } catch (err) {
    console.warn('Auth0 getSession error in getOrCreateCurrentUser:', err);
  }

  let user = await User.findOne({ auth0Id });

  if (!user) {
    const baseCandidate = nickname || email.split('@')[0] || name;
    const username = await generateUniqueUsername(baseCandidate);

    user = await User.create({
      auth0Id,
      username,
      name,
      email,
      picture,
      bio: 'Ready to conquer goals and milestones!',
    });
  }

  return user;
}

