import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import Goal from '@/lib/models/Goal';
import User from '@/lib/models/User';
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

    const rawUsername = (body.username || '').trim().replace(/^@/, '').toLowerCase();
    if (!rawUsername) {
      return NextResponse.json({ error: 'Please provide a valid username to invite.' }, { status: 400 });
    }

    const goal = await Goal.findById(id);
    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    const isCreator =
      goal.creatorUserId === currentUser.auth0Id ||
      String(goal.creator) === String(currentUser._id) ||
      goal.members.some(m => m.auth0Id === currentUser.auth0Id && m.role === 'creator');

    if (!isCreator) {
      return NextResponse.json({ error: 'Only the creator can send invitations for this goal.' }, { status: 403 });
    }

    if (goal.goalType === 'personal') {
      return NextResponse.json({ error: 'Personal goals cannot have other members.' }, { status: 400 });
    }

    // Find the invited user by username
    const targetUser = await User.findOne({ username: rawUsername });
    if (!targetUser) {
      return NextResponse.json(
        { error: `User with username @${rawUsername} was not found.` },
        { status: 404 }
      );
    }

    if (targetUser.auth0Id === currentUser.auth0Id) {
      return NextResponse.json({ error: 'You are already the creator of this goal.' }, { status: 400 });
    }

    // Check if user is already a member
    const existing = goal.members.find(
      m => m.auth0Id === targetUser.auth0Id || String(m.user) === String(targetUser._id)
    );

    if (existing) {
      if (existing.status === 'active') {
        return NextResponse.json({ message: `@${targetUser.username} is already an active member.` });
      }
      if (existing.status === 'invited') {
        return NextResponse.json({ message: `An invitation has already been sent to @${targetUser.username}.` });
      }
      if (existing.status === 'pending_approval') {
        // Creator inviting someone who already requested -> automatically accept!
        existing.status = 'active';
        await goal.save();
        return NextResponse.json({ message: `@${targetUser.username}'s pending request was accepted!` });
      }
    }

    // Add invited member
    goal.members.push({
      user: targetUser._id,
      auth0Id: targetUser.auth0Id,
      role: 'member',
      status: 'invited',
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

    return NextResponse.json({
      message: `Invitation successfully sent to @${targetUser.username}!`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to send invitation';
    console.error('POST /api/goals/[id]/invite error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

