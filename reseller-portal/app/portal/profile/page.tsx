'use client';

import { useEffect, useState } from 'react';

interface Profile {
  email: string;
  discountRate: number;
  accessCode: string;
  company: string;
}

export default function ProfilePage() {
  const [profile, setProfile]       = useState<Profile | null>(null);
  const [loading, setLoading]       = useState(true);
  const [regenerating, setRegen]    = useState(false);
  const [confirmRegen, setConfirm]  = useState(false);
  const [copied, setCopied]         = useState(false);
  const [message, setMessage]       = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.json())
      .then(data => {
        setProfile(data);
        setLoading(false);
      });
  }, []);

  async function copyCode() {
    if (!profile?.accessCode) return;
    await navigator.clipboard.writeText(profile.accessCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function regenerate() {
    setRegen(true);
    setMessage(null);
    const res = await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'regenerate_code' }),
    });
    const data = await res.json();
    setRegen(false);
    setConfirm(false);
    if (!res.ok) {
      setMessage({ type: 'error', text: data.error ?? 'Failed to regenerate code.' });
      return;
    }
    setProfile(p => p ? { ...p, accessCode: data.accessCode } : p);
    setMessage({ type: 'success', text: 'New access code generated. Use it next time you sign in.' });
  }

  async function handleSignOut() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
  }

  if (loading || !profile) {
    return <div className="text-sm text-gray-400 text-center py-16">Loading profile…</div>;
  }

  return (
    <div className="max-w-2xl">
      <h2 className="text-lg font-semibold mb-6">My Profile</h2>

      {message && (
        <div className={`mb-4 rounded-xl px-4 py-3 text-sm border ${
          message.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50   border-red-200   text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* Account Info */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Account Information</h3>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between items-baseline">
            <dt className="text-gray-500">Email</dt>
            <dd className="font-medium text-gray-900">{profile.email}</dd>
          </div>
          {profile.company && (
            <div className="flex justify-between items-baseline">
              <dt className="text-gray-500">Company</dt>
              <dd className="font-medium text-gray-900">{profile.company}</dd>
            </div>
          )}
          <div className="flex justify-between items-baseline">
            <dt className="text-gray-500">Commission Rate</dt>
            <dd className="font-semibold text-blue-600">{profile.discountRate}%</dd>
          </div>
        </dl>
      </div>

      {/* Access Code */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Access Code</h3>
        <p className="text-xs text-gray-500 mb-4">Use this code together with your email to sign in.</p>

        <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 flex items-center justify-between mb-4">
          <code className="font-mono text-sm tracking-wide text-gray-900">{profile.accessCode}</code>
          <button
            onClick={copyCode}
            className="text-xs font-medium text-blue-600 hover:text-blue-700"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        {!confirmRegen ? (
          <button
            onClick={() => setConfirm(true)}
            className="text-xs text-gray-500 hover:text-red-600 transition-colors"
          >
            Regenerate code
          </button>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-xs text-red-800 mb-3">
              Generating a new code will invalidate the current one. Anyone using the old code will be locked out.
            </p>
            <div className="flex gap-2">
              <button
                onClick={regenerate}
                disabled={regenerating}
                className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {regenerating ? 'Generating…' : 'Yes, regenerate'}
              </button>
              <button
                onClick={() => setConfirm(false)}
                className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Help */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Need help?</h3>
        <ul className="text-sm text-gray-600 space-y-2">
          <li>• To change your email, commission rate, or company name, contact <a href="mailto:info@scubaseekers.com" className="text-blue-600 hover:underline">info@scubaseekers.com</a></li>
          <li>• Commissions are paid out by Scuba Seekers based on completed (paid) orders.</li>
          <li>• Your access code is private — never share it with customers.</li>
        </ul>
      </div>

      <button
        onClick={handleSignOut}
        className="text-sm text-gray-500 hover:text-red-600 transition-colors"
      >
        Sign out of all devices
      </button>
    </div>
  );
}
