'use client';

import { useRouter } from 'next/navigation';

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  }

  return (
    <button
      onClick={handleLogout}
      className="text-sm text-gray-400 hover:text-gray-700 transition-colors"
    >
      Sign out
    </button>
  );
}
