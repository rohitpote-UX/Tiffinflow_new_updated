import { NextRequest, NextResponse } from 'next/server';
import { localDb } from '@/lib/db';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = body.email?.toLowerCase().trim();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const user = localDb.users.find((u) => u.email.toLowerCase() === email && u.is_active);

    // Always respond with success to prevent user enumeration
    if (!user) {
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a reset code has been sent.',
      });
    }

    // Generate secure 6-digit reset token
    const token = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min expiry

    // Remove existing tokens for user
    const tokens = localDb.password_reset_tokens.filter((t) => t.user_id !== user.id);
    tokens.push({ token, user_id: user.id, expires_at: expiresAt });
    localDb.data.password_reset_tokens = tokens;
    localDb.save();

    console.log(`[AUTH] Password reset token generated for ${user.email}: ${token}`);

    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, a reset code has been sent.',
      demoToken: process.env.NODE_ENV !== 'production' ? token : undefined,
    });
  } catch (err: any) {
    console.error('Forgot password error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
