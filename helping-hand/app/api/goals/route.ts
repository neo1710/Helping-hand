import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Goal, { ICheckpointReward } from '@/lib/models/Goal';
import '@/lib/models/User';
import { getOrCreateCurrentUser } from '@/lib/userHelper';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const currentUser = await getOrCreateCurrentUser();
    const { searchParams } = new URL(req.url);

    const parent = searchParams.get('parent') || ''; // 'my' | 'public' | ''
    const subtype = searchParams.get('subtype') || searchParams.get('type') || 'all';

    const now = new Date();

    let query: Record<string, unknown> = {};

    if (parent === 'my') {
      // "My Goals": ONLY goals where user is creator OR an ACTIVE member
      // Until user joins any public goal, it will NEVER appear in the "my" section!
      const userIsMemberOrCreator = {
        $or: [
          { creator: currentUser._id },
          { creatorUserId: currentUser.auth0Id },
          { userId: currentUser.auth0Id },
          {
            members: {
              $elemMatch: {
                auth0Id: currentUser.auth0Id,
                status: 'active',
              },
            },
          },
        ],
      };

      if (subtype && subtype !== 'all') {
        query = {
          $and: [
            userIsMemberOrCreator,
            { goalType: subtype },
          ],
        };
      } else {
        query = userIsMemberOrCreator;
      }
    } else if (parent === 'public') {
      // "Public Goals": Available public goals (collaborative, competitive, open)
      // EXCLUDES personal goals, EXCLUDES expired open goals, and
      // EXCLUDES goals where the current user is ALREADY an active member (since those belong in "My Goals")!
      const isPublicType = {
        $or: [
          { goalType: { $in: ['collaborative', 'competitive'] } },
          { goalType: 'open', endDate: { $gte: now } },
        ],
      };

      // Not created by current user and not already joined by current user as active
      const notJoinedYet = {
        creator: { $ne: currentUser._id },
        creatorUserId: { $ne: currentUser.auth0Id },
        userId: { $ne: currentUser.auth0Id },
        members: {
          $not: {
            $elemMatch: {
              auth0Id: currentUser.auth0Id,
              status: 'active',
            },
          },
        },
      };

      if (subtype && subtype !== 'all') {
        query = {
          $and: [
            isPublicType,
            notJoinedYet,
            { goalType: subtype },
          ],
        };
      } else {
        query = {
          $and: [
            isPublicType,
            notJoinedYet,
          ],
        };
      }
    } else {
      // Default / fallback
      if (subtype === 'personal') {
        query = {
          goalType: 'personal',
          $or: [
            { creator: currentUser._id },
            { creatorUserId: currentUser.auth0Id },
            { userId: currentUser.auth0Id },
          ],
        };
      } else if (subtype === 'collaborative') {
        query = { goalType: 'collaborative' };
      } else if (subtype === 'competitive') {
        query = { goalType: 'competitive' };
      } else if (subtype === 'open') {
        query = { goalType: 'open', endDate: { $gte: now } };
      } else if (subtype === 'my') {
        query = {
          $or: [
            { creator: currentUser._id },
            { creatorUserId: currentUser.auth0Id },
            { userId: currentUser.auth0Id },
            {
              members: {
                $elemMatch: {
                  auth0Id: currentUser.auth0Id,
                  status: 'active',
                },
              },
            },
          ],
        };
      } else {
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

    const formattedRewards: ICheckpointReward[] = [];
    for (let i = 1; i <= parsedCheckpoints; i++) {
      const milestoneValue = Math.round((parsedTarget * (i / parsedCheckpoints)) * 100) / 100;
      const userReward = rewards?.[i - 1]?.reward || rewards?.[i - 1] || `Milestone ${i} Reward!`;
      formattedRewards.push({
        checkpointIndex: i,
        milestoneValue,
        reward: typeof userReward === 'string' ? userReward.trim() : `Milestone ${i} Reward!`,
      });
    }

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
