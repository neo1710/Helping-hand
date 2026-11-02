import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import Goal from '@/lib/models/Goal';
import { getCurrentUserId } from '@/lib/auth0';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, context: RouteContext) {
  const userId = await getCurrentUserId();

  try {
    const { id } = await context.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    await connectDB();

    // Query by id, allowing matches for this user, demo user, or legacy goals
    const query =
      userId && userId !== 'demo-user-local'
        ? {
            _id: id,
            $or: [
              { userId },
              { userId: 'demo-user-local' },
              { userId: { $exists: false } },
              { userId: null },
            ],
          }
        : { _id: id };

    const goal = await Goal.findOne(query).lean();
    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    return NextResponse.json({ goal });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch goal';
    console.error('GET /api/goals/[id] error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const userId = await getCurrentUserId();

  try {
    const { id } = await context.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    await connectDB();
    const body = await req.json();

    const query =
      userId && userId !== 'demo-user-local'
        ? {
            _id: id,
            $or: [
              { userId },
              { userId: 'demo-user-local' },
              { userId: { $exists: false } },
              { userId: null },
            ],
          }
        : { _id: id };

    const goal = await Goal.findOne(query);
    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    const { amount, note } = body;

    if (typeof amount === 'number' && amount > 0) {
      goal.progress = Math.min(goal.target, goal.progress + amount);
      goal.log.push({ amount, note: note || '', date: new Date() });
      if (goal.progress >= goal.target) {
        goal.status = 'completed';
      }
    }

    if (body.status && ['active', 'completed', 'abandoned'].includes(body.status)) {
      goal.status = body.status;
    }

    await goal.save();
    return NextResponse.json({ goal });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update goal';
    console.error('PATCH /api/goals/[id] error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const userId = await getCurrentUserId();

  try {
    const { id } = await context.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    await connectDB();

    const query =
      userId && userId !== 'demo-user-local'
        ? {
            _id: id,
            $or: [
              { userId },
              { userId: 'demo-user-local' },
              { userId: { $exists: false } },
              { userId: null },
            ],
          }
        : { _id: id };

    const goal = await Goal.findOneAndDelete(query);
    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Goal deleted successfully' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete goal';
    console.error('DELETE /api/goals/[id] error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
