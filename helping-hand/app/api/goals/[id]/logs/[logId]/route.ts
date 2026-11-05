import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import Goal from '@/lib/models/Goal';
import '@/lib/models/User';
import { getOrCreateCurrentUser } from '@/lib/userHelper';

interface RouteContext {
  params: Promise<{ id: string; logId: string }>;
}

// Helper to recalculate goal progress & status
function recalculateGoalProgress(goal: any) {
  if (goal.goalType === 'collaborative') {
    const totalProgress = goal.members
      .filter((m: any) => m.status === 'active')
      .reduce((sum: number, m: any) => sum + (Number(m.progress) || 0), 0);
    goal.progress = Math.min(goal.target, Math.max(0, totalProgress));
    if (goal.progress >= goal.target) {
      goal.status = 'completed';
    } else if (goal.status === 'completed') {
      goal.status = 'active';
    }
  } else if (goal.goalType === 'personal') {
    const creatorMember = goal.members.find((m: any) => m.role === 'creator') || goal.members[0];
    goal.progress = creatorMember ? creatorMember.progress : 0;
    if (goal.progress >= goal.target) {
      goal.status = 'completed';
    } else if (goal.status === 'completed') {
      goal.status = 'active';
    }
  } else {
    // competitive or open
    const activeMembers = goal.members.filter((m: any) => m.status === 'active');
    goal.progress = activeMembers.length > 0
      ? Math.max(...activeMembers.map((m: any) => Number(m.progress) || 0))
      : 0;

    const allCompleted = activeMembers.length > 0 && activeMembers.every((m: any) => (m.progress || 0) >= goal.target);
    const isEnded = new Date() > new Date(goal.endDate);

    if (allCompleted || isEnded) {
      goal.status = 'completed';
    } else if (goal.status === 'completed' && !isEnded) {
      goal.status = 'active';
    }
  }
}

// PATCH: Edit a log entry
export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id, logId } = await context.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    if (!logId) {
      return NextResponse.json({ error: 'Log ID is required' }, { status: 400 });
    }

    await connectDB();
    const currentUser = await getOrCreateCurrentUser();
    const body = await req.json();

    const { amount, note } = body;

    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: 'Amount must be greater than zero.' }, { status: 400 });
    }

    const goal = await Goal.findById(id);
    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    const now = new Date();
    if (now > new Date(goal.endDate)) {
      return NextResponse.json({ error: 'This goal has passed its deadline. Logs cannot be modified.' }, { status: 400 });
    }
    if (now < new Date(goal.startDate)) {
      return NextResponse.json({ error: 'This goal has not started yet.' }, { status: 400 });
    }

    // Find the log entry in goal.log
    const goalLogIndex = goal.log.findIndex(
      (l: any) => String(l._id) === logId || String(l.id) === logId
    );

    let targetUserId = currentUser.auth0Id;
    let oldAmount = 0;
    let entryDate: Date | null = null;

    if (goalLogIndex >= 0) {
      const entry = goal.log[goalLogIndex];
      targetUserId = entry.userId || targetUserId;
      oldAmount = entry.amount;
      entryDate = entry.date;

      const isCreator =
        goal.creatorUserId === currentUser.auth0Id ||
        String(goal.creator) === String(currentUser._id);

      if (entry.userId && entry.userId !== currentUser.auth0Id && !isCreator) {
        return NextResponse.json({ error: 'You can only edit your own log entries.' }, { status: 403 });
      }

      entry.amount = parsedAmount;
      if (typeof note === 'string') {
        entry.note = note.trim();
      }
    }

    // Also update the log entry inside the member's log
    const member = goal.members.find(
      (m: any) => m.auth0Id === targetUserId || String(m.user) === String(currentUser._id)
    );

    if (member) {
      // Find log in member.log by _id or by matching oldAmount and approximate date
      let memberLogIndex = member.log.findIndex(
        (l: any) => String(l._id) === logId || String(l.id) === logId
      );

      if (memberLogIndex === -1 && entryDate) {
        memberLogIndex = member.log.findIndex(
          (l: any) =>
            l.amount === oldAmount &&
            Math.abs(new Date(l.date).getTime() - new Date(entryDate!).getTime()) < 10000
        );
      }

      if (memberLogIndex >= 0) {
        member.log[memberLogIndex].amount = parsedAmount;
        if (typeof note === 'string') {
          member.log[memberLogIndex].note = note.trim();
        }
      }

      // Recalculate member's total progress
      const memberTotal = member.log.reduce(
        (sum: number, l: any) => sum + (Number(l.amount) || 0),
        0
      );
      member.progress = Math.min(goal.target, Math.max(0, memberTotal));
    } else if (goalLogIndex === -1) {
      return NextResponse.json({ error: 'Log entry not found.' }, { status: 404 });
    }

    // Recalculate overall goal progress
    recalculateGoalProgress(goal);

    await goal.save();

    const populated = await Goal.findById(goal._id)
      .populate('creator', 'username name picture bio')
      .populate('members.user', 'username name picture bio')
      .lean();

    return NextResponse.json({
      message: 'Log entry updated successfully',
      goal: populated,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update log entry';
    console.error('PATCH /api/goals/[id]/logs/[logId] error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE: Delete a log entry
export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const { id, logId } = await context.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    if (!logId) {
      return NextResponse.json({ error: 'Log ID is required' }, { status: 400 });
    }

    await connectDB();
    const currentUser = await getOrCreateCurrentUser();

    const goal = await Goal.findById(id);
    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    const now = new Date();
    if (now > new Date(goal.endDate)) {
      return NextResponse.json({ error: 'This goal has passed its deadline. Logs cannot be deleted.' }, { status: 400 });
    }
    if (now < new Date(goal.startDate)) {
      return NextResponse.json({ error: 'This goal has not started yet.' }, { status: 400 });
    }

    // Find the log entry in goal.log
    const goalLogIndex = goal.log.findIndex(
      (l: any) => String(l._id) === logId || String(l.id) === logId
    );

    let targetUserId = currentUser.auth0Id;
    let oldAmount = 0;
    let entryDate: Date | null = null;

    if (goalLogIndex >= 0) {
      const entry = goal.log[goalLogIndex];
      targetUserId = entry.userId || targetUserId;
      oldAmount = entry.amount;
      entryDate = entry.date;

      const isCreator =
        goal.creatorUserId === currentUser.auth0Id ||
        String(goal.creator) === String(currentUser._id);

      if (entry.userId && entry.userId !== currentUser.auth0Id && !isCreator) {
        return NextResponse.json({ error: 'You can only delete your own log entries.' }, { status: 403 });
      }

      goal.log.splice(goalLogIndex, 1);
    }

    // Remove from the member's log
    const member = goal.members.find(
      (m: any) => m.auth0Id === targetUserId || String(m.user) === String(currentUser._id)
    );

    if (member) {
      let memberLogIndex = member.log.findIndex(
        (l: any) => String(l._id) === logId || String(l.id) === logId
      );

      if (memberLogIndex === -1 && entryDate) {
        memberLogIndex = member.log.findIndex(
          (l: any) =>
            l.amount === oldAmount &&
            Math.abs(new Date(l.date).getTime() - new Date(entryDate!).getTime()) < 10000
        );
      }

      if (memberLogIndex >= 0) {
        member.log.splice(memberLogIndex, 1);
      }

      // Recalculate member's total progress
      const memberTotal = member.log.reduce(
        (sum: number, l: any) => sum + (Number(l.amount) || 0),
        0
      );
      member.progress = Math.min(goal.target, Math.max(0, memberTotal));
    } else if (goalLogIndex === -1) {
      return NextResponse.json({ error: 'Log entry not found.' }, { status: 404 });
    }

    // Recalculate overall goal progress
    recalculateGoalProgress(goal);

    await goal.save();

    const populated = await Goal.findById(goal._id)
      .populate('creator', 'username name picture bio')
      .populate('members.user', 'username name picture bio')
      .lean();

    return NextResponse.json({
      message: 'Log entry deleted successfully',
      goal: populated,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete log entry';
    console.error('DELETE /api/goals/[id]/logs/[logId] error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

