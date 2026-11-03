import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Goal, { ICheckpointReward } from '@/lib/models/Goal';
import '@/lib/models/User'; // Ensure User model is registered
import { getOrCreateCurrentUser } from '@/lib/userHelper';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const currentUser = await getOrCreateCurrentUser();
    const { searchParams } = new URL(req.url);
    const filterType = searchParams.get('type') || 'all';

    const now = new Date();

    // Base query conditions depending on filterType
    let query: Record<string, unknown> = {};

    if (filterType === 'personal') {
      query = {
        goalType: 'personal',
        $or: [
          { creator: currentUser._id },
          { creatorUserId: currentUser.auth0Id },
          { userId: currentUser.auth0Id },
          { userId: 'demo-user-local' },
        ],
      };
    } else if (filterType === 'collaborative') {
      query = { goalType: 'collaborative' };
    } else if (filterType === 'competitive') {
      query = { goalType: 'competitive' };
    } else if (filterType === 'open') {
      // Open goals disappear after deadline!
      query = {
        goalType: 'open',
        endDate: { $gte: now },
      };
    } else if (filterType === 'my') {
      // Goals where the user is creator or an active member
      query = {
        $or: [
          { creator: currentUser._id },
          { creatorUserId: currentUser.auth0Id },
          { userId: currentUser.auth0Id },
          { 'members.auth0Id': currentUser.auth0Id },
        ],
      };
    } else {
      // 'all' tab:
      // Show user's personal/active goals + public/shared goals
      // Hide expired open goals unless user was part of them
      query = {
        $or: [
          { creator: currentUser._id },
          { creatorUserId: currentUser.auth0Id },
          { userId: currentUser.auth0Id },
          { 'members.auth0Id': currentUser.auth0Id },
          { goalType: { $in: ['collaborative', 'competitive'] } },
          { goalType: 'open', endDate: { $gte: now } },
        ],
      };
    }

    const goals = await Goal.find(query)
      .populate('creator', 'username name picture')
      .populate('members.user', 'username name picture bio')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      goals: goals || [],
      currentUserId: currentUser.auth0Id,
      currentUsername: currentUser.username,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch goals';
    console.error('GET /api/goals error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const currentUser = await getOrCreateCurrentUser();
    const body = await req.json();

    const {
      name,
      description,
      goalType = 'personal',
      target,
      unit,
      startDate,
      endDate,
      checkpoints = 4,
      rewards = [],
      avatarIndex = 0,
      avatarTone = '#3b82f6',
      avatarSkin = '#f0c4a0',
      avatarHair = 'short',
      avatarHairColor = '#2b2118',
    } = body;

    if (!name || !target || !unit || !startDate || !endDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const parsedTarget = Number(target);
    const parsedCheckpoints = Math.min(20, Math.max(4, Number(checkpoints) || 4));

    if (parsedTarget <= 0) {
      return NextResponse.json({ error: 'Target must be greater than zero.' }, { status: 400 });
    }

    if (new Date(endDate) <= new Date(startDate)) {
      return NextResponse.json({ error: 'Deadline must be after start date.' }, { status: 400 });
    }

    // Build rewards array (from 1 to checkpoints)
    const formattedRewards: ICheckpointReward[] = [];
    for (let i = 1; i <= parsedCheckpoints; i++) {
      const milestoneValue = Math.round((parsedTarget * (i / parsedCheckpoints)) * 100) / 100;
      const userReward = rewards?.[i - 1]?.reward || rewards?.[i - 1] || `Milestone ${i} Reward! 🎉`;
      formattedRewards.push({
        checkpointIndex: i,
        milestoneValue,
        reward: typeof userReward === 'string' ? userReward.trim() : `Milestone ${i} Reward! 🎉`,
      });
    }

    // Create Goal document with the creator as the first active member
    const goal = await Goal.create({
      creator: currentUser._id,
      creatorUserId: currentUser.auth0Id,
      userId: currentUser.auth0Id,
      name: name.trim(),
      description: (description || '').trim(),
      goalType: ['personal', 'collaborative', 'competitive', 'open'].includes(goalType)
        ? goalType
        : 'personal',
      target: parsedTarget,
      unit: unit || 'km',
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      checkpoints: parsedCheckpoints,
      rewards: formattedRewards,
      avatarIndex: Number(avatarIndex) || 0,
      avatarTone: avatarTone || '#3b82f6',
      avatarSkin: avatarSkin || '#f0c4a0',
      avatarHair: avatarHair || 'short',
      avatarHairColor: avatarHairColor || '#2b2118',
      progress: 0,
      log: [],
      status: 'active',
      members: [
        {
          user: currentUser._id,
          auth0Id: currentUser.auth0Id,
          role: 'creator',
          status: 'active',
          joinedAt: new Date(),
          progress: 0,
          avatarIndex: Number(avatarIndex) || 0,
          avatarTone: avatarTone || '#3b82f6',
          avatarSkin: avatarSkin || '#f0c4a0',
          avatarHair: avatarHair || 'short',
          avatarHairColor: avatarHairColor || '#2b2118',
          log: [],
        },
      ],
    });

    // Populate creator and members
    const populatedGoal = await Goal.findById(goal._id)
      .populate('creator', 'username name picture')
      .populate('members.user', 'username name picture')
      .lean();

    return NextResponse.json({ goal: populatedGoal }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create goal';
    console.error('POST /api/goals error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
