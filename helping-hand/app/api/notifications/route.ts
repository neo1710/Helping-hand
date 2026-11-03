import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Goal from '@/lib/models/Goal';
import '@/lib/models/User';
import { getOrCreateCurrentUser } from '@/lib/userHelper';

export async function GET() {
  try {
    await connectDB();
    const currentUser = await getOrCreateCurrentUser();

    // 1. Invitations received by the current user
    const invitations = await Goal.find({
      'members': {
        $elemMatch: {
          auth0Id: currentUser.auth0Id,
          status: 'invited',
        },
      },
    })
      .populate('creator', 'username name picture')
      .select('name goalType target unit endDate creator checkpoints rewards members')
      .lean();

    // 2. Sent join requests: Goals where current user has requested to join and is waiting for approval
    const sentRequests = await Goal.find({
      'members': {
        $elemMatch: {
          auth0Id: currentUser.auth0Id,
          status: 'pending_approval',
        },
      },
    })
      .populate('creator', 'username name picture')
      .select('name goalType target unit endDate creator members')
      .lean();

    // 3. Received join requests on goals created by current user
    const createdGoals = await Goal.find({
      $or: [
        { creator: currentUser._id },
        { creatorUserId: currentUser.auth0Id },
        { userId: currentUser.auth0Id },
      ],
      'members.status': 'pending_approval',
    })
      .populate('members.user', 'username name picture bio')
      .select('name goalType target unit members')
      .lean();

    // Flatten received join requests with user details
    const receivedRequests: Array<{
      goalId: string;
      goalName: string;
      goalType: string;
      memberId: string;
      user: {
        _id?: unknown;
        username?: string;
        name?: string;
        picture?: string;
      };
      joinedAt: Date;
    }> = [];

    for (const g of createdGoals) {
      for (const m of g.members || []) {
        if (m.status === 'pending_approval') {
          const u = m.user as { _id?: unknown; username?: string; name?: string; picture?: string } | undefined;
          receivedRequests.push({
            goalId: String(g._id),
            goalName: g.name,
            goalType: g.goalType,
            memberId: String(m._id),
            user: {
              _id: u?._id,
              username: u?.username || 'user',
              name: u?.name || 'Applicant',
              picture: u?.picture || '',
            },
            joinedAt: m.joinedAt,
          });
        }
      }
    }

    const pendingActionCount = invitations.length + receivedRequests.length;

    return NextResponse.json({
      invitations,
      sentRequests,
      receivedRequests,
      pendingActionCount,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch notifications';
    console.error('GET /api/notifications error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

