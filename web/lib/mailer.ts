import axios from 'axios';

export async function addResendSubscriber(email: string): Promise<{ email: string; token: string; subscribedAt: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('Email service is not configured');
  }

  try {
    await axios.post(
      'https://api.resend.com/contacts',
      {
        email,
        firstName: email.split('@')[0],
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 409) {
        return {
          email,
          token: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
          subscribedAt: new Date().toISOString(),
        };
      }
      if (status === 401) {
        throw new Error('Email service authentication failed');
      }
    }
    throw error;
  }

  return {
    email,
    token: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
    subscribedAt: new Date().toISOString(),
  };
}

export async function removeResendSubscriber(email: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not set');
  }

  try {
    await axios.get('https://api.resend.com/contacts', {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      params: {
        email,
      },
    });

    await axios.delete(`https://api.resend.com/contacts/${encodeURIComponent(email)}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    return true;
  } catch (error) {
    console.error('Failed to remove Resend subscriber:', error);
    return false;
  }
}

export async function getResendSubscribers(): Promise<{ email: string; token: string; subscribedAt: string; unsubscribedAt?: string }[]> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return [];
  }

  try {
    const response = await axios.get('https://api.resend.com/contacts', {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    const contacts = response.data.data || [];
    return contacts.map((contact: { email: string; createdAt: string }) => ({
      email: contact.email,
      token: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
      subscribedAt: contact.createdAt,
      unsubscribedAt: undefined,
    }));
  } catch (error) {
    console.error('Failed to fetch Resend subscribers:', error);
    return [];
  }
}
