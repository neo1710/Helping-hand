import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import { getOrCreateCurrentUser } from '@/lib/userHelper';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const candidate = (searchParams.get('username') || '').trim().toLowerCase();

    if (!candidate || !/^[a-z0-9_]{3,30}$/.test(candidate)) {
      return NextResponse.json({
        available: false,
        reason: 'Must be 3-30 characters (letters, numbers, underscores)',
      });
    }

    await connectDB();
    const currentUser = await getOrCreateCurrentUser();

    if (currentUser.username === candidate) {
      return NextResponse.json({ available: true, isCurrent: true });
    }

    const exists = await User.exists({ username: candidate });
    if (exists) {
      return NextResponse.json({
        available: false,
        reason: 'Username already taken',
      });
    }

    return NextResponse.json({ available: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error checking username';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

