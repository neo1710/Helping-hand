import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import Goal from '@/lib/models/Goal';
import { getOrCreateCurrentUser } from '@/lib/userHelper';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    await connectDB();
    const currentUser = await getOrCreateCurrentUser();
    const body = await req.json();

    const { memberId, action } = body; // action: 'accept' | 'reject' | 'leave'

    if (!['accept', 'reject', 'leave'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const goal = await Goal.findById(id);
    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    const isCreator =
      goal.creatorUserId === currentUser.auth0Id ||
      String(goal.creator) === String(currentUser._id) ||
      goal.members.some(m => m.auth0Id === currentUser.auth0Id && m.role === 'creator');

    // Scenario 1: User leaving or declining invite for themselves
    if (action === 'leave' || (!isCreator && (action === 'accept' || action === 'reject'))) {
      const myMemberIndex = goal.members.findIndex(
        m => m.auth0Id === currentUser.auth0Id || String(m.user) === String(currentUser._id)
      );

      if (myMemberIndex === -1) {
        return NextResponse.json({ error: 'You are not a member of this goal' }, { status: 404 });
      }

      const myMember = goal.members[myMemberIndex];

      if (action === 'accept' && myMember.status === 'invited') {
        myMember.status = 'active';
        await goal.save();
        return NextResponse.json({ message: 'You have joined the goal!' });
      }

      if (action === 'reject' || action === 'leave') {
        if (myMember.role === 'creator') {
          return NextResponse.json({ error: 'Creators cannot leave their own goal. Delete it instead.' }, { status: 400 });
        }
        goal.members.splice(myMemberIndex, 1);

        // Recalculate progress after member leaves
        if (goal.goalType === 'collaborative') {
          const totalProgress = goal.members
            .filter(m => m.status === 'active')
            .reduce((sum, m) => sum + (m.progress || 0), 0);
          goal.progress = Math.min(goal.target, totalProgress);
        } else if (goal.goalType === 'competitive' || goal.goalType === 'open') {
          const activeMembers = goal.members.filter(m => m.status === 'active');
          goal.progress = activeMembers.length > 0
            ? Math.max(...activeMembers.map(m => m.progress || 0))
            : 0;

          const allCompleted = activeMembers.length > 0 && activeMembers.every(m => (m.progress || 0) >= goal.target);
          const isEnded = new Date() > new Date(goal.endDate);

          if (allCompleted || isEnded) {
            goal.status = 'completed';
          } else if (goal.status === 'completed' && !isEnded) {
            goal.status = 'active';
          }
        } else if (goal.goalType === 'personal') {
          const creatorMember = goal.members.find(m => m.role === 'creator') || goal.members[0];
          goal.progress = creatorMember ? creatorMember.progress : 0;
          if (goal.progress >= goal.target) {
            goal.status = 'completed';
          } else if (goal.status === 'completed') {
            goal.status = 'active';
          }
        }

        await goal.save();
        return NextResponse.json({ message: 'You have left the goal.' });
      }
    }

    // Scenario 2: Creator managing requests/invites for a specific memberId
    if (isCreator && memberId) {
      const targetIndex = goal.members.findIndex(m => String(m._id) === String(memberId));
      if (targetIndex === -1) {
        return NextResponse.json({ error: 'Member record not found.' }, { status: 404 });
      }

      const targetMember = goal.members[targetIndex];

      if (action === 'accept') {
        targetMember.status = 'active';
        await goal.save();
        return NextResponse.json({ message: 'Member request accepted!' });
      }

      if (action === 'reject') {
        goal.members.splice(targetIndex, 1);
        await goal.save();
        return NextResponse.json({ message: 'Member request removed.' });
      }
    }

    return NextResponse.json({ error: 'Unauthorized or invalid action' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to process member action';
    console.error('POST /api/goals/[id]/members error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

