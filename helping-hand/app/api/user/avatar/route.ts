import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { getOrCreateCurrentUser } from '@/lib/userHelper';

// GET: Retrieve the logged-in user's custom avatar
export async function GET() {
  try {
    await connectDB();
    const currentUser = await getOrCreateCurrentUser();

    // Default configuration if the user hasn't customized one yet
    const defaultAvatar = {
      name: 'Hero Companion',
      tone: '#3b82f6',
      skin: '#f0c4a0',
      hairStyle: 'short',
      hairColor: '#2b2118',
      eyesColor: '#1a1a2e',
      clothingStyle: 'hoodie',
      accessory: 'none',
      expression: 'happy',
    };

    return NextResponse.json({
      customAvatar: currentUser.customAvatar || defaultAvatar,
      hasCustomAvatar: Boolean(currentUser.customAvatar?.name),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch avatar';
    console.error('GET /api/user/avatar error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST/PUT: Save or update the custom avatar configuration
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const currentUser = await getOrCreateCurrentUser();
    const body = await req.json();

    const {
      name = 'Hero Companion',
      tone = '#3b82f6',
      skin = '#f0c4a0',
      hairStyle = 'short',
      hairColor = '#2b2118',
      eyesColor = '#1a1a2e',
      clothingStyle = 'hoodie',
      accessory = 'none',
      expression = 'happy',
    } = body;

    currentUser.customAvatar = {
      name: String(name).slice(0, 40).trim() || 'Hero Companion',
      tone: String(tone).slice(0, 30),
      skin: String(skin).slice(0, 30),
      hairStyle: String(hairStyle).slice(0, 30),
      hairColor: String(hairColor).slice(0, 30),
      eyesColor: String(eyesColor).slice(0, 30),
      clothingStyle: String(clothingStyle).slice(0, 30),
      accessory: String(accessory).slice(0, 30),
      expression: String(expression).slice(0, 30),
    };

    await currentUser.save();

    return NextResponse.json({
      message: 'Custom avatar saved successfully!',
      customAvatar: currentUser.customAvatar,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to save avatar';
    console.error('POST /api/user/avatar error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

