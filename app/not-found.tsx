import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-12 bg-paper text-center">
      <h2 className="text-2xl font-display font-bold mb-2">Page Not Found</h2>
      <p className="text-sm text-ink/60 mb-6 max-w-md">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        href="/"
        className="px-4 py-2 bg-slate-900 text-white rounded text-xs hover:opacity-90 transition font-mono"
      >
        Return Dashboard
      </Link>
    </div>
  );
}
