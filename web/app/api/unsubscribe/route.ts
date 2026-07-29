import { NextResponse } from 'next/server';
import { removeResendSubscriber } from '@/lib/mailer';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const success = await removeResendSubscriber(email);
    if (success) {
      return NextResponse.json({ success: true, message: 'Unsubscribed successfully' });
    }

    return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 400 });
  } catch (error) {
    console.error('Unsubscribe error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
