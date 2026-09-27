'use client';

import { useState } from 'react';

export default function SubscribePage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('');

    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage('You\'re subscribed! Check your inbox for confirmation.');
        setEmail('');
      } else {
        setStatus('error');
        setMessage(data.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setStatus('error');
      setMessage('Something went wrong. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Subscribe to The Gradient</h1>
          <p className="text-[var(--text-secondary)]">
            Get the latest AI news delivered to your inbox every day.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full px-4 py-2 border border-[var(--border)] rounded-md bg-background text-foreground "
            />
          </div>

          <button
            type="submit"
            disabled={status === 'loading'}
            className="primary-button w-full"
          >
            {status === 'loading' ? 'Subscribing...' : 'Subscribe'}
          </button>

          {message && (
            <p
              className={`text-sm text-center ${
                status === 'success' ? 'text-[var(--success)]' : 'text-[var(--error)]'
              }`}
            >
              {message}
            </p>
          )}
        </form>

        <p className="text-xs text-[var(--text-secondary)] text-center mt-6">
          By subscribing, you agree to receive email newsletters. You can unsubscribe at any time.
        </p>
      </div>
    </div>
  );
}
