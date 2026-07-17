'use client';

import React from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <div className="flex-1 min-h-screen bg-paper text-ink flex flex-col items-center justify-center p-6 font-mono text-center">
          <h2 className="text-xl font-bold mb-4">Something went wrong!</h2>
          <p className="text-xs text-ink/60 mb-6 max-w-md leading-relaxed">
            {error?.message || 'An unexpected error occurred during rendering.'}
          </p>
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-slate-900 text-white rounded text-xs hover:opacity-90 transition"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
