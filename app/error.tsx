'use client';

import React, { useEffect } from 'react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled segment error:', error);
  }, [error]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-12 bg-surface border border-line rounded-xl m-6 text-center shadow-sm">
      <h2 className="text-lg font-bold mb-2">Something went wrong in this section</h2>
      <p className="text-xs text-ink/60 mb-6 max-w-md leading-relaxed">
        {error?.message || 'An unexpected error occurred.'}
      </p>
      <button
        onClick={() => reset()}
        className="px-4 py-2 bg-slate-900 text-white rounded text-xs hover:opacity-90 transition font-mono"
      >
        Retry Segment
      </button>
    </div>
  );
}
