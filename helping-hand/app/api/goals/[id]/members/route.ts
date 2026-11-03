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
        await goal.save();
        return NextResponse.json({ message: 'You have left or declined the goal.' });
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

