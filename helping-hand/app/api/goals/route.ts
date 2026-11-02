import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Goal from '@/lib/models/Goal';
import { getCurrentUserId } from '@/lib/auth0';

export async function GET() {
  const userId = await getCurrentUserId();

  try {
    await connectDB();
    // Retrieve goals for this user, including any created in demo mode or prior to auth
    const query =
      userId && userId !== 'demo-user-local'
        ? {
            $or: [
              { userId },
              { userId: 'demo-user-local' },
              { userId: { $exists: false } },
              { userId: null },
            ],
          }
        : {
            $or: [
              { userId: 'demo-user-local' },
              { userId: { $exists: false } },
              { userId: null },
            ],
          };

    const goals = await Goal.find(query).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ goals: goals || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch goals';
    console.error('GET /api/goals error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();

  try {
    await connectDB();
    const body = await req.json();

    const {
      name,
      target,
      unit,
      startDate,
      endDate,
      checkpoints,
      avatarIndex,
      avatarTone,
      avatarSkin,
      avatarHair,
      avatarHairColor,
    } = body;

    if (!name || !target || !unit || !startDate || !endDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const goal = await Goal.create({
      userId: userId || 'demo-user-local',
      name: name.trim(),
      target: Number(target),
      unit: unit || 'km',
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      checkpoints: Number(checkpoints) || 3,
      avatarIndex: Number(avatarIndex) || 0,
      avatarTone: avatarTone || '#3b82f6',
      avatarSkin: avatarSkin || '#f0c4a0',
      avatarHair: avatarHair || 'short',
      avatarHairColor: avatarHairColor || '#2b2118',
      progress: 0,
      log: [],
      status: 'active',
    });

    return NextResponse.json({ goal }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create goal';
    console.error('POST /api/goals error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
