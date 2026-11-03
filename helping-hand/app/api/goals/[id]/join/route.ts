import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import Goal from '@/lib/models/Goal';
import { getOrCreateCurrentUser } from '@/lib/userHelper';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    await connectDB();
    const currentUser = await getOrCreateCurrentUser();

    const goal = await Goal.findById(id);
    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    if (goal.goalType === 'personal') {
      return NextResponse.json({ error: 'Personal goals cannot be joined by other users.' }, { status: 400 });
    }

    if (goal.goalType === 'open' && new Date() > new Date(goal.endDate)) {
      return NextResponse.json({ error: 'This open goal has reached its deadline.' }, { status: 400 });
    }

    // Check if user is already a member
    const existingIndex = goal.members.findIndex(
      m =>
        m.auth0Id === currentUser.auth0Id ||
        String(m.user) === String(currentUser._id)
    );

    if (existingIndex >= 0) {
      const existing = goal.members[existingIndex];
      if (existing.status === 'active') {
        return NextResponse.json({ message: 'You are already an active participant in this goal.' });
      }
      if (existing.status === 'pending_approval') {
        return NextResponse.json({ message: 'Your join request is already pending creator approval.' });
      }
      if (existing.status === 'invited') {
        // Automatically accept invite!
        existing.status = 'active';
        await goal.save();
        return NextResponse.json({ message: 'Invitation accepted! Welcome to the goal.' });
      }
    }

    if (goal.goalType === 'open') {
      // Open goals can be joined immediately by anyone
      goal.members.push({
        user: currentUser._id,
        auth0Id: currentUser.auth0Id,
        role: 'member',
        status: 'active',
        joinedAt: new Date(),
        progress: 0,
        avatarIndex: 0,
        avatarTone: '#3b82f6',
        avatarSkin: '#f0c4a0',
        avatarHair: 'short',
        avatarHairColor: '#2b2118',
        log: [],
      });
      await goal.save();
      return NextResponse.json({ message: 'Successfully joined the open goal!' });
    } else {
      // Collaborative or Competitive: requires creator approval
      goal.members.push({
        user: currentUser._id,
        auth0Id: currentUser.auth0Id,
        role: 'member',
        status: 'pending_approval',
        joinedAt: new Date(),
        progress: 0,
        avatarIndex: 0,
        avatarTone: '#3b82f6',
        avatarSkin: '#f0c4a0',
        avatarHair: 'short',
        avatarHairColor: '#2b2118',
        log: [],
      });
      await goal.save();
      return NextResponse.json({ message: 'Join request sent! The creator will review your request.' });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to join goal';
    console.error('POST /api/goals/[id]/join error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

