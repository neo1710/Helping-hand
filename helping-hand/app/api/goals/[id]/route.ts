import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import Goal from '@/lib/models/Goal';
import '@/lib/models/User';
import { getOrCreateCurrentUser } from '@/lib/userHelper';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    await connectDB();
    const currentUser = await getOrCreateCurrentUser();

    const goal = await Goal.findById(id)
      .populate('creator', 'username name picture bio')
      .populate('members.user', 'username name picture bio')
      .lean();

    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    // Check if goal is expired or upcoming
    const now = new Date();
    const isUpcoming = new Date(goal.startDate) > now;
    const isEnded = new Date(goal.endDate) < now;
    const isExpired = isEnded;

    // Find current user's membership
    const userMember = goal.members?.find(
      m =>
        m.auth0Id === currentUser.auth0Id ||
        (m.user && String((m.user as { _id?: unknown })._id || m.user) === String(currentUser._id))
    );

    const isCreator =
      goal.creatorUserId === currentUser.auth0Id ||
      String(goal.creator?._id || goal.creator) === String(currentUser._id) ||
      userMember?.role === 'creator';

    // Compute leaderboard / rankings for competitive and open goals
    const activeMembers = (goal.members || [])
      .filter(m => m.status === 'active')
      .map(m => {
        const u = m.user as { username?: string; name?: string; picture?: string } | undefined;
        return {
          memberId: m._id,
          userId: m.auth0Id,
          username: u?.username || 'member',
          name: u?.name || 'Member',
          picture: u?.picture || '',
          progress: m.progress || 0,
          percentage: goal.target > 0 ? Math.min(100, Math.round(((m.progress || 0) / goal.target) * 100)) : 0,
          joinedAt: m.joinedAt,
          role: m.role,
        };
      })
      .sort((a, b) => b.progress - a.progress);

    return NextResponse.json({
      goal,
      currentUserId: currentUser.auth0Id,
      currentUsername: currentUser.username,
      currentUserProfile: currentUser,
      currentUserAvatar: currentUser.customAvatar || null,
      isCreator,
      isUpcoming,
      isEnded,
      isExpired,
      membershipStatus: userMember ? userMember.status : 'none',
      userProgress: userMember?.progress ?? goal.progress,
      rankings: activeMembers,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch goal';
    console.error('GET /api/goals/[id] error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    await connectDB();
    const currentUser = await getOrCreateCurrentUser();
    const body = await req.json();

    const goal = await Goal.findById(id);
    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    const { amount, note, status } = body;
    const now = new Date();

    // Check if goal has not started yet
    if (now < new Date(goal.startDate)) {
      const startStr = new Date(goal.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      return NextResponse.json(
        { error: `This goal has not started yet. Logging progress will unlock on ${startStr}.` },
        { status: 400 }
      );
    }

    // Check if goal deadline has passed (for all goals)
    if (now > new Date(goal.endDate)) {
      const endStr = new Date(goal.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      return NextResponse.json(
        { error: `This goal reached its deadline on ${endStr}. Progress logging is closed.` },
        { status: 400 }
      );
    }

    // Find or add current user as member
    let member = goal.members.find(m => m.auth0Id === currentUser.auth0Id);

    if (!member) {
      if (goal.goalType === 'open') {
        // Auto-join open goals
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
        member = goal.members[goal.members.length - 1];
      } else if (goal.creatorUserId === currentUser.auth0Id || goal.userId === currentUser.auth0Id) {
        // Creator missing from members list (legacy fallback)
        goal.members.push({
          user: currentUser._id,
          auth0Id: currentUser.auth0Id,
          role: 'creator',
          status: 'active',
          joinedAt: new Date(),
          progress: goal.progress || 0,
          avatarIndex: goal.avatarIndex || 0,
          avatarTone: goal.avatarTone || '#3b82f6',
          avatarSkin: goal.avatarSkin || '#f0c4a0',
          avatarHair: goal.avatarHair || 'short',
          avatarHairColor: goal.avatarHairColor || '#2b2118',
          log: goal.log || [],
        });
        member = goal.members[goal.members.length - 1];
      } else {
        return NextResponse.json(
          { error: 'You are not an active participant of this goal.' },
          { status: 403 }
        );
      }
    }

    if (member.status !== 'active') {
      return NextResponse.json(
        { error: 'Your membership is not yet active (pending approval or invite).' },
        { status: 403 }
      );
    }

    if (typeof amount === 'number' && amount > 0) {
      // Check if user has already completed the goal target
      if ((member.progress || 0) >= goal.target) {
        return NextResponse.json(
          { error: 'You have already reached 100% of your target for this goal! Congratulations on finishing your journey.' },
          { status: 400 }
        );
      }

      // Check if non-competitive goal is already completed
      if (goal.status === 'completed' && goal.goalType !== 'competitive' && goal.goalType !== 'open') {
        return NextResponse.json(
          { error: 'This goal has already been completed.' },
          { status: 400 }
        );
      }

      const logId = new mongoose.Types.ObjectId();
      const entry = {
        _id: logId,
        userId: currentUser.auth0Id,
        username: currentUser.username,
        amount,
        note: note || '',
        date: new Date(),
      };

      // Add to member's personal progress & log
      member.log.push(entry);
      member.progress = Math.min(
        goal.target,
        member.log.reduce((acc: number, l: any) => acc + (Number(l.amount) || 0), 0)
      );

      // Add to goal-level log
      goal.log.push(entry);

      if (goal.goalType === 'collaborative') {
        // In collaborative goals, total progress is the sum of all active members' progress
        const totalProgress = goal.members
          .filter(m => m.status === 'active')
          .reduce((sum, m) => sum + (m.progress || 0), 0);
        goal.progress = Math.min(goal.target, totalProgress);
        if (goal.progress >= goal.target) {
          goal.status = 'completed';
        }
      } else if (goal.goalType === 'personal') {
        goal.progress = member.progress;
        if (goal.progress >= goal.target) {
          goal.status = 'completed';
        }
      } else {
        // competitive or open: goal progress represents the top/highest member progress
        const activeMembers = goal.members.filter(m => m.status === 'active');
        const maxProgress = activeMembers.length > 0
          ? Math.max(...activeMembers.map(m => m.progress || 0))
          : 0;
        goal.progress = maxProgress;

        // Competitive goal does NOT close when 1 player completes.
        // It waits for ALL active players to reach the target, OR for the end date to arrive.
        const allCompleted = activeMembers.length > 0 && activeMembers.every(m => (m.progress || 0) >= goal.target);
        const isEnded = new Date() > new Date(goal.endDate);

        if (allCompleted || isEnded) {
          goal.status = 'completed';
        }
      }
    }

    if (status && ['active', 'completed', 'abandoned'].includes(status)) {
      const isCreator =
        goal.creatorUserId === currentUser.auth0Id ||
        String(goal.creator) === String(currentUser._id) ||
        member.role === 'creator';

      if (!isCreator && status !== 'completed') {
        return NextResponse.json(
          { error: 'Only the creator can change the goal status.' },
          { status: 403 }
        );
      }
      goal.status = status;
    }

    await goal.save();

    const populated = await Goal.findById(goal._id)
      .populate('creator', 'username name picture bio')
      .populate('members.user', 'username name picture bio')
      .lean();

    return NextResponse.json({ goal: populated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update goal';
    console.error('PATCH /api/goals/[id] error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
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

    const isCreator =
      goal.creatorUserId === currentUser.auth0Id ||
      goal.userId === currentUser.auth0Id ||
      String(goal.creator) === String(currentUser._id);

    if (!isCreator) {
      return NextResponse.json({ error: 'Only the creator can delete this goal' }, { status: 403 });
    }

    await Goal.findByIdAndDelete(id);
    return NextResponse.json({ message: 'Goal deleted successfully' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete goal';
    console.error('DELETE /api/goals/[id] error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
