import { NextResponse } from 'next/server';
import { unsubscribeByToken, findSubscriberByToken } from '@/lib/subscribers';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const token = searchParams.get('token');

    if (!email || !token) {
      return NextResponse.json({ error: 'Email and token are required' }, { status: 400 });
    }

    const subscriber = findSubscriberByToken(token);
    if (!subscriber || subscriber.email !== email) {
      return NextResponse.json({ error: 'Invalid or expired unsubscribe link' }, { status: 400 });
    }

    const success = unsubscribeByToken(token);
    if (success) {
      return NextResponse.json({ success: true, message: 'Unsubscribed successfully' });
    }

    return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 400 });
  } catch (error) {
    console.error('Unsubscribe error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
