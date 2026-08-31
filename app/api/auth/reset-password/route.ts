import { NextRequest, NextResponse } from 'next/server';
import { localDb } from '@/lib/db';
import { hashPassword } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, newPassword } = body;

    if (!token || !newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Valid 6-digit code and new password (min 6 chars) are required' },
        { status: 400 }
      );
    }

    const resetRecord = localDb.password_reset_tokens.find(
      (t) => t.token === token.trim() && new Date(t.expires_at) > new Date()
    );

    if (!resetRecord) {
      return NextResponse.json(
        { error: 'Invalid or expired password reset token' },
        { status: 400 }
      );
    }

    const user = localDb.users.find((u) => u.id === resetRecord.user_id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Update password
    user.password_hash = await hashPassword(newPassword);
    user.updated_at = new Date().toISOString();

    // Invalidate used reset token
    localDb.data.password_reset_tokens = localDb.password_reset_tokens.filter(
      (t) => t.token !== token
    );
    localDb.save();

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully! You can now log in.',
    });
  } catch (err: any) {
    console.error('Reset password error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
