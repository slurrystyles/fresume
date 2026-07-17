import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ibm-plex-sans",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Fresume — Truth-Grounded AI Resume Builder",
  description: "Build your career with Fresume — a highly-polished, ATS-safe, verified-evidence resume editor.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${fraunces.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable}`}>
      <body className="bg-slate-950 text-slate-100 font-body min-h-screen flex flex-col antialiased">
        {/* Sleek Fresume Glassmorphic Navbar */}
        <header className="border-b border-slate-900 bg-slate-950/75 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-display text-2xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
              Fresume
            </span>
            <span className="font-mono text-[10px] px-2 py-0.5 bg-slate-900 rounded border border-slate-800 text-amber-400 uppercase tracking-wider font-semibold">
              Truth-Grounded AI
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-slate-400 font-mono">India & International ATS Ready</p>
            </div>
          </div>
        </header>

        {/* Core application view */}
        <main className="flex-1 flex flex-col">
          {children}
        </main>
      </body>
    </html>
  );
}
