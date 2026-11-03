import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import Goal from '@/lib/models/Goal';
import { getOrCreateCurrentUser } from '@/lib/userHelper';

export async function GET() {
  try {
    await connectDB();
    const currentUser = await getOrCreateCurrentUser();

    // Fetch stats
    const goalsCreated = await Goal.countDocuments({
      $or: [{ creator: currentUser._id }, { creatorUserId: currentUser.auth0Id }, { userId: currentUser.auth0Id }],
    });

    const goalsCompleted = await Goal.countDocuments({
      status: 'completed',
      $or: [
        { creator: currentUser._id },
        { creatorUserId: currentUser.auth0Id },
        { 'members.auth0Id': currentUser.auth0Id },
      ],
    });

    // Fetch invitations sent to this user
    const pendingInvites = await Goal.find({
      'members': {
        $elemMatch: {
          auth0Id: currentUser.auth0Id,
          status: 'invited',
        },
      },
    })
      .populate('creator', 'username name picture')
      .select('name goalType target unit endDate creator')
      .lean();

    return NextResponse.json({
      user: currentUser,
      stats: {
        goalsCreated,
        goalsCompleted,
      },
      invitations: pendingInvites,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch user profile';
    console.error('GET /api/user/profile error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await connectDB();
    const currentUser = await getOrCreateCurrentUser();
    const body = await req.json();

    const { username, name, bio } = body;

    if (username !== undefined) {
      const cleanUsername = String(username).trim().toLowerCase();
      if (!/^[a-z0-9_]{3,30}$/.test(cleanUsername)) {
        return NextResponse.json(
          { error: 'Username must be 3-30 characters long and contain only lowercase letters, numbers, and underscores.' },
          { status: 400 }
        );
      }

      // Check if username is already taken by another user
      const existing = await User.findOne({
        username: cleanUsername,
        _id: { $ne: currentUser._id },
      });

      if (existing) {
        return NextResponse.json(
          { error: `The username "${cleanUsername}" is already taken. Please choose another.` },
          { status: 409 }
        );
      }

      currentUser.username = cleanUsername;
    }

    if (name !== undefined) {
      const cleanName = String(name).trim();
      if (!cleanName) {
        return NextResponse.json({ error: 'Display name cannot be empty.' }, { status: 400 });
      }
      currentUser.name = cleanName.slice(0, 80);
    }

    if (bio !== undefined) {
      currentUser.bio = String(bio).trim().slice(0, 280);
    }

    await currentUser.save();

    return NextResponse.json({
      message: 'Profile updated successfully',
      user: currentUser,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update profile';
    console.error('PUT /api/user/profile error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

