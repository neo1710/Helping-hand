import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import Goal from '@/lib/models/Goal';
import { getOrCreateCurrentUser } from '@/lib/userHelper';

interface RouteContext {
  params: Promise<{ username: string }>;
}

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { username } = await context.params;

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    await connectDB();
    const currentUser = await getOrCreateCurrentUser();

    const cleanUsername = String(username).trim().toLowerCase();

    // Look up target user by unique username
    const targetUser = await User.findOne({ username: cleanUsername })
      .select('username name bio picture customAvatar createdAt')
      .lean();

    if (!targetUser) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const isSelf = targetUser.username === currentUser.username;

    // Fetch goals where targetUser is creator or an active member
    const userParticipationQuery = {
      $or: [
        { creator: targetUser._id },
        { creatorUserId: (targetUser as any).auth0Id },
        {
          members: {
            $elemMatch: {
              $or: [
                { user: targetUser._id },
                { auth0Id: (targetUser as any).auth0Id },
              ],
              status: 'active',
            },
          },
        },
      ],
    };

    // Calculate goals stats (total, completed, active)
    const allUserGoals = await Goal.find(userParticipationQuery)
      .select('status name description goalType accessType target unit progress startDate endDate createdAt')
      .sort({ createdAt: -1 })
      .lean();

    const totalGoals = allUserGoals.length;
    const completedGoals = allUserGoals.filter(g => g.status === 'completed').length;
    const activeGoals = allUserGoals.filter(g => g.status === 'active').length;

    // For privacy purposes, other users NEVER receive details of the user's goals history.
    // Only the user viewing their own profile receives their own goal details if needed.
    const goalsHistory = isSelf
      ? allUserGoals.map(g => {
          const pct = g.target > 0 ? Math.min(100, Math.round(((g.progress || 0) / g.target) * 100)) : 0;
          return {
            _id: g._id,
            name: g.name,
            description: g.description || '',
            goalType: g.goalType,
            accessType: (g as any).accessType || 'public',
            target: g.target,
            unit: g.unit,
            progress: g.progress || 0,
            percentage: pct,
            status: g.status,
            startDate: g.startDate,
            endDate: g.endDate,
            createdAt: g.createdAt,
          };
        })
      : [];

    // Sanitized profile without email or auth0Id
    const safeProfile = {
      username: targetUser.username,
      name: targetUser.name,
      bio: targetUser.bio || '',
      picture: targetUser.picture || '',
      customAvatar: targetUser.customAvatar || null,
      createdAt: targetUser.createdAt,
    };

    return NextResponse.json({
      user: safeProfile,
      goalsHistory,
      stats: {
        totalGoals,
        completedGoals,
        activeGoals,
      },
      isSelf,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch user profile';
    console.error('GET /api/user/profile/[username] error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

