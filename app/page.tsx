import Link from "next/link";
import { Sparkles, FileText, CheckCircle2, ShieldCheck, ArrowRight, Layers, LayoutGrid, Clock, Printer } from "lucide-react";

export const dynamic = "force-dynamic";

export default function MarketingPage() {
  const templates = [
    { id: "classic", label: "Classic Professional", sub: "Standard, corporate roles (Finance, Sales, Ops)" },
    { id: "grotesk", label: "Modern Grotesk", sub: "Tech, software engineering, and creative startups" },
    { id: "campus", label: "Campus Fresher (IN)", sub: "Indian student CGPA, course work & XII/X board logs" },
    { id: "internship", label: "Internship/Fresher Intl.", sub: "Student roles, project-centric layout with no boards" },
    { id: "compact", label: "Executive Compact", sub: "Dense layout optimized for 5+ years of experience" },
    { id: "academic", label: "Academic/Research", sub: "Expanded CV style for publications, research, & teaching" },
    { id: "minimal", label: "Structured Minimal", sub: "Clean design-adjacent with fine accent highlights" },
    { id: "fresher-psu", label: "Formal/PSU (IN)", sub: "Government jobs requiring passport size photo layouts" },
  ];

  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen flex flex-col font-sans overflow-hidden relative">
      {/* Background radial glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] bg-indigo-600/5 rounded-full blur-[140px] pointer-events-none"></div>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 text-center space-y-8 relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full text-xs font-mono font-medium animate-pulse">
          <Sparkles size={12} />
          <span>Next-Generation ATS Resume compiler</span>
        </div>
        <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tight text-white max-w-4xl mx-auto leading-none">
          Resumes without the <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">AI Hallucinations</span>.
        </h1>
        <p className="text-base md:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Fresume is a truth-grounded AI resume editor. We analyze your ATS compliance for free, audit verification lineage, and compile standard compliance designs.
        </p>
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-4">
          <Link
            href="/app"
            className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-mono text-sm font-bold shadow-lg shadow-blue-500/20 hover:shadow-blue-500/35 transition-all flex items-center justify-center gap-2"
          >
            <span>Start Building for Free</span>
            <ArrowRight size={14} />
          </Link>
          <a
            href="#how-it-works"
            className="w-full sm:w-auto px-8 py-3 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded-xl font-mono text-sm transition-all flex items-center justify-center"
          >
            How it Works
          </a>
        </div>
      </section>

      {/* How it Works Pipeline */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-6 py-20 border-t border-slate-900 relative z-10 w-full">
        <div className="text-center space-y-3 mb-16">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-white">The Truth-Grounded Pipeline</h2>
          <p className="text-sm text-slate-400 max-w-lg mx-auto font-mono">
            How Fresume guards your lineage from end-to-end.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connecting Line (Desktop) */}
          <div className="hidden md:block absolute top-1/2 left-[15%] right-[15%] h-[1px] bg-gradient-to-r from-blue-500/40 via-indigo-500/40 to-slate-800/40 -translate-y-1/2 pointer-events-none z-0"></div>

          {/* Stage 1: Analyze */}
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-6 rounded-2xl relative z-10 space-y-4 hover:border-blue-500/30 transition-all">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
              <FileText size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">1. Analyze</h3>
                <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">FREE</span>
              </div>
              <p className="text-xs font-mono text-slate-500 mt-0.5 uppercase tracking-wider">ATS Compliance Scan</p>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-body">
              Upload your resume or paste raw text. Fresume executes instant parseability audits, checks formatting gaps, and flags missing metrics for free.
            </p>
          </div>

          {/* Stage 2: Fix */}
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-6 rounded-2xl relative z-10 space-y-4 hover:border-blue-500/30 transition-all">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Layers size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">2. Fix</h3>
                <span className="text-[9px] font-mono text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded">PAID PASS</span>
              </div>
              <p className="text-xs font-mono text-slate-500 mt-0.5 uppercase tracking-wider">AI Grounded Auditing</p>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-body">
              Edit bullets interactively with AI assistance. Fresume locks down verb strength and enforces factual representation using the non-repudiable ledger audit.
            </p>
          </div>

          {/* Stage 3: Generate */}
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-6 rounded-2xl relative z-10 space-y-4 hover:border-blue-500/30 transition-all">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <Printer size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">3. Generate</h3>
                <span className="text-[9px] font-mono text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded">PAID PASS</span>
              </div>
              <p className="text-xs font-mono text-slate-500 mt-0.5 uppercase tracking-wider">ATS-Guaranteed Compiler</p>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-body">
              Compile your clean resume without Fresume branding. Download PDF, DOCX, or Plaintext instantly to send out to recruiters.
            </p>
          </div>
        </div>
      </section>

      {/* Trust & Differentiator Section */}
      <section className="max-w-6xl mx-auto px-6 py-20 border-t border-slate-900 relative z-10 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6 text-left">
            <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl flex items-center justify-center">
              <ShieldCheck size={24} />
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-white leading-tight">
              Anti-Hallucination: AI Grounding Guard
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed font-body">
              Unlike generic AI writers that fabricate fake numbers to inflate scores (e.g. claiming you "saved $10M" out of nowhere), Fresume maintains a strict **evidence constraint**. 
            </p>
            <p className="text-sm text-slate-400 leading-relaxed font-body">
              Our AI rewrite assistant will help you structure sentences using strong action verbs and professional style guidelines, but it **strictly rejects inventing metrics**. If a metric is missing, Fresume guides you to provide real data points, keeping your resume 105% audit-safe and truthful.
            </p>
          </div>
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-8 rounded-2xl space-y-6">
            <h3 className="text-xs font-mono uppercase tracking-widest text-slate-500">Grounded Audit Ledger</h3>
            <div className="space-y-4">
              <div className="p-4 bg-slate-950 border border-slate-850 rounded-xl space-y-1">
                <span className="text-[10px] font-mono text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded">REJECTED BY AI GUARD</span>
                <p className="text-xs text-slate-400 font-mono mt-1">"Optimized pipeline code which decreased latency by 45% and saved $500,000 yearly."</p>
                <p className="text-[10px] text-slate-500 font-mono mt-1">* Reason: Latency metrics and financial figures not found in raw human experience files.</p>
              </div>
              <div className="p-4 bg-slate-950 border border-slate-850 rounded-xl space-y-1">
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">GROUNDED COMPLIANCE</span>
                <p className="text-xs text-slate-300 font-mono mt-1">"Refactored backend pipeline code, introducing [ADD LATENCY METRIC] to optimize data throughput."</p>
                <p className="text-[10px] text-slate-500 font-mono mt-1">* Reason: Prompt user placeholder added safely. Facts validated.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Template Showcase */}
      <section className="max-w-6xl mx-auto px-6 py-20 border-t border-slate-900 relative z-10 w-full">
        <div className="text-center space-y-3 mb-16">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-white">8 ATS-Guaranteed Templates</h2>
          <p className="text-sm text-slate-400 max-w-lg mx-auto font-mono">
            Designed for specific regions and career segments.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {templates.map((tmpl) => (
            <div key={tmpl.id} className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-5 rounded-xl space-y-3 hover:border-slate-700 transition-all flex flex-col justify-between">
              <div className="space-y-2">
                <span className="text-[9px] font-mono text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Template
                </span>
                <h3 className="text-sm font-bold text-white font-body">{tmpl.label}</h3>
                <p className="text-[11px] text-slate-400 leading-relaxed font-sans">{tmpl.sub}</p>
              </div>
              <Link href="/app" className="text-[11px] font-mono text-blue-400 hover:text-blue-300 flex items-center gap-1.5 pt-2">
                <span>View Style</span>
                <ArrowRight size={10} />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section className="max-w-6xl mx-auto px-6 py-20 border-t border-slate-900 relative z-10 w-full text-center">
        <div className="text-center space-y-3 mb-16">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-white">Transparent Pay-Per-Use Pricing</h2>
          <p className="text-sm text-slate-400 max-w-lg mx-auto font-mono">
            No recurring credit card charges. Pay only when you are satisfied.
          </p>
        </div>

        <div className="max-w-md mx-auto bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6 text-center">
          <div className="space-y-1">
            <span className="text-[9px] font-mono text-blue-400 uppercase tracking-widest font-semibold bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 rounded">
              Single Session Pass
            </span>
            <div className="flex items-center justify-center gap-1.5 pt-2">
              <span className="font-mono text-4xl font-bold text-white">₹20</span>
              <span className="text-slate-500 text-xs font-mono">/ resume session</span>
            </div>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed font-body">
            Upload or paste details, analyze your compliance metrics, and check your ATS compatibility completely for free. Only purchase a pass to access interactive rewrite fixes and export documents.
          </p>

          <div className="border-t border-slate-800 pt-4 text-left space-y-3 text-xs font-mono">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">1. Compliance Score Scan</span>
              <span className="text-emerald-400 font-bold">100% Free</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">2. Missing Details Finder</span>
              <span className="text-emerald-400 font-bold">100% Free</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">3. AI Grounding Audit Check</span>
              <span className="text-emerald-400 font-bold">100% Free</span>
            </div>
            <div className="flex items-center justify-between border-t border-slate-850 pt-2">
              <span className="text-slate-300">4. Interactive Line Fixes</span>
              <span className="text-blue-400">Paid Session</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-300">5. PDF/DOCX/TXT Downloads</span>
              <span className="text-blue-400">Paid Session</span>
            </div>
          </div>

          <Link
            href="/app"
            className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg font-mono text-sm font-bold shadow-lg shadow-blue-500/10 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Activate Session now</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-8 text-center text-xs text-slate-600 font-mono relative z-10">
        <p>© {new Date().getFullYear()} Fresume — Truth-Grounded AI Resume Builder. All rights reserved.</p>
      </footer>
    </div>
  );
}
