"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Sparkles, FileText, CheckCircle2, ShieldCheck, ArrowRight, Layers, LayoutGrid, Clock, Printer, X } from "lucide-react";

export default function MarketingPage() {
  const [previewTemplate, setPreviewTemplate] = useState<string | null>(null);

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

  const mockData = {
    name: "Aman Sharma",
    title: "Senior Full Stack Engineer",
    email: "aman.sharma@example.com",
    phone: "+91 98765 43210",
    location: "Delhi, India",
    linkedin: "linkedin.com/in/amansharma",
    github: "github.com/amansharma",
    summary: "Results-driven Software Engineer with 4+ years of experience designing and optimizing distributed web applications. Expert in React, Node.js, and cloud systems, focusing on data auditability and performance benchmarks.",
    experience: [
      {
        title: "Senior Software Engineer",
        company: "DataLedger Technologies",
        location: "Bengaluru, India",
        date: "2023 - Present",
        bullets: [
          "Architected a real-time ledger auditing engine that processed 5M+ database changes with zero discrepancies.",
          "Refactored backend microservices using Node.js, reducing query latency by 35% across critical endpoints.",
          "Led a team of 4 engineers to build the responsive client dashboard using React and Tailwind CSS."
        ]
      },
      {
        title: "Software Engineer",
        company: "WebCraft Solutions",
        location: "New Delhi, India",
        date: "2021 - 2023",
        bullets: [
          "Developed and maintained responsive e-commerce web portals, improving checkout conversions by 15%.",
          "Optimized client-side bundles, resulting in a 1.2s improvement in First Contentful Paint (FCP) metrics."
        ]
      }
    ],
    projects: [
      {
        title: "AuditTrace Engine",
        role: "Lead Creator",
        tech: "TypeScript, PostgreSQL, Docker",
        bullets: [
          "Created an open-source data versioning utility with secure SHA-256 integrity checks."
        ]
      }
    ],
    skills: {
      languages: ["TypeScript", "JavaScript", "Go", "SQL"],
      tools: ["React", "Node.js", "Next.js", "Docker", "AWS", "PostgreSQL"],
      soft: ["Technical Leadership", "Agile Operations", "Communication"]
    },
    education: [
      {
        degree: "B.Tech in Computer Science & Engineering",
        institution: "Delhi Technological University (DTU)",
        date: "2017 - 2021",
        grade: "8.9 CGPA",
        boards: "XII: 95.2% | X: 10.0 CGPA"
      }
    ]
  };

  const renderTemplatePreview = (tmplId: string) => {
    const isGrotesk = tmplId === "grotesk";
    const isCampus = tmplId === "campus";
    const isCompact = tmplId === "compact";
    const isAcademic = tmplId === "academic";
    const isMinimal = tmplId === "minimal";
    const isPSU = tmplId === "fresher-psu";
    const isInternship = tmplId === "internship";

    const fontStyle = isAcademic ? "font-serif text-[10px]" : isGrotesk ? "font-sans text-[10px]" : "font-sans text-[10px]";

    return (
      <div className={`w-full bg-white text-slate-800 p-6 rounded-lg shadow-inner ${fontStyle} leading-normal text-left max-h-[60vh] overflow-y-auto`}>
        {/* Header Section */}
        {isPSU ? (
          <div className="border border-slate-300 p-4 mb-4 flex justify-between items-start">
            <div className="space-y-1">
              <h1 className="text-base font-bold text-slate-900 font-serif uppercase tracking-wide">{mockData.name}</h1>
              <p className="text-[9px] font-mono text-slate-600">{mockData.email} | {mockData.phone}</p>
              <p className="text-[9px] font-mono text-slate-600">Location: {mockData.location} | DOB: 12-10-1999</p>
            </div>
            <div className="w-16 h-20 border border-dashed border-slate-400 bg-slate-100 flex items-center justify-center text-[7px] text-slate-400 text-center font-mono">
              Passport Photo
            </div>
          </div>
        ) : (
          <div className={`pb-4 border-b border-slate-200 mb-4 text-center ${isGrotesk ? 'text-left' : ''} ${isMinimal ? 'border-l-4 border-l-slate-800 pl-3 border-b-0 pb-0' : ''}`}>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">{mockData.name}</h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">{mockData.title}</p>
            <div className="flex flex-wrap justify-center gap-x-3 text-[9px] text-slate-400 mt-1 font-mono">
              <span>{mockData.location}</span>
              <span>•</span>
              <span>{mockData.phone}</span>
              <span>•</span>
              <span>{mockData.email}</span>
            </div>
            <div className="flex justify-center gap-x-3 text-[9px] text-slate-400 mt-0.5 font-mono">
              <span>{mockData.linkedin}</span>
              <span>•</span>
              <span>{mockData.github}</span>
            </div>
          </div>
        )}

        {/* Summary */}
        {!isCompact && !isPSU && (
          <div className="mb-4 space-y-1">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-0.5">Professional Summary</h2>
            <p className="text-[10px] text-slate-600 leading-relaxed">{mockData.summary}</p>
          </div>
        )}

        {/* Experience Section */}
        <div className="mb-4 space-y-2">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-0.5">Experience</h2>
          {mockData.experience.map((exp, index) => (
            <div key={index} className="space-y-1">
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-bold text-slate-900">{exp.title}</span>
                  <span className="text-slate-500"> — {exp.company}</span>
                </div>
                <span className="text-[9px] text-slate-400 font-mono">{exp.date}</span>
              </div>
              <ul className="list-disc pl-4 space-y-0.5 text-[9px] text-slate-600 leading-relaxed">
                {exp.bullets.map((bullet, idx) => (
                  <li key={idx}>{bullet}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Projects Section */}
        <div className="mb-4 space-y-2">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-0.5">Projects</h2>
          {mockData.projects.map((proj, index) => (
            <div key={index} className="space-y-1">
              <div className="flex justify-between items-start">
                <span className="font-bold text-slate-900">{proj.title} | <span className="font-normal text-slate-500">{proj.role}</span></span>
                <span className="text-[9px] text-slate-400 font-mono">Tech: {proj.tech}</span>
              </div>
              <ul className="list-disc pl-4 space-y-0.5 text-[9px] text-slate-600 leading-relaxed">
                {proj.bullets.map((bullet, idx) => (
                  <li key={idx}>{bullet}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Skills Section */}
        <div className="mb-4 space-y-1">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-0.5">Skills</h2>
          <div className="grid grid-cols-1 gap-1 text-[9px] text-slate-600">
            <div><strong className="text-slate-900">Languages:</strong> {mockData.skills.languages.join(", ")}</div>
            <div><strong className="text-slate-900">Tools & Platforms:</strong> {mockData.skills.tools.join(", ")}</div>
            {!isCompact && <div><strong className="text-slate-900">Soft Skills:</strong> {mockData.skills.soft.join(", ")}</div>}
          </div>
        </div>

        {/* Education Section */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-0.5">Education</h2>
          {mockData.education.map((edu, index) => (
            <div key={index} className="space-y-0.5">
              <div className="flex justify-between">
                <span className="font-bold text-slate-900">{edu.degree}</span>
                <span className="text-[9px] text-slate-400 font-mono">{edu.date}</span>
              </div>
              <div className="text-slate-600 flex justify-between text-[9px]">
                <span>{edu.institution}</span>
                <span className="font-semibold text-slate-700">Grade: {edu.grade}</span>
              </div>
              {(isCampus || isPSU) && (
                <div className="text-[8px] font-mono text-slate-500 bg-slate-50 border border-slate-150 p-1.5 rounded mt-0.5">
                  {edu.boards}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

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
                <p className="text-[10px] text-slate-500 font-mono mt-1">* Reason: Facts validated. Placeholders added safely.</p>
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
            Designed for specific regions and career segments. Click a card to preview.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {templates.map((tmpl) => (
            <div 
              key={tmpl.id} 
              onClick={() => setPreviewTemplate(tmpl.id)}
              className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-5 rounded-xl space-y-3 hover:border-slate-700 transition-all flex flex-col justify-between cursor-pointer group"
            >
              <div className="space-y-2">
                <span className="text-[9px] font-mono text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider group-hover:border-blue-500/40 transition-all">
                  Template
                </span>
                <h3 className="text-sm font-bold text-white font-body group-hover:text-blue-400 transition-all">{tmpl.label}</h3>
                <p className="text-[11px] text-slate-400 leading-relaxed font-sans">{tmpl.sub}</p>
              </div>
              <span className="text-[11px] font-mono text-blue-400 group-hover:text-blue-300 flex items-center gap-1.5 pt-2">
                <span>View Style Preview</span>
                <ArrowRight size={10} />
              </span>
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

      {/* TEMPLATE PREVIEW MODAL */}
      {previewTemplate && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-6 z-50 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl flex flex-col space-y-4 relative">
            <button 
              onClick={() => setPreviewTemplate(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 transition-all"
            >
              <X size={20} />
            </button>
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-blue-400 uppercase tracking-widest font-semibold bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded">
                Live Design Showcase
              </span>
              <h3 className="font-display text-xl font-bold text-white">
                {templates.find(t => t.id === previewTemplate)?.label} Layout Preview
              </h3>
            </div>
            
            {/* Render selected stylesheet miniature resume inside the modal */}
            {renderTemplatePreview(previewTemplate)}

            <div className="flex justify-between items-center pt-2">
              <p className="text-[10px] text-slate-500 font-mono">
                * Note: Displays clean ATS-optimized rendering with no watermark tags.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPreviewTemplate(null)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200 font-mono transition-all"
                >
                  Close
                </button>
                <Link
                  href="/app"
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg font-mono text-xs font-bold shadow-lg shadow-blue-500/10 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Use this Template</span>
                  <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-900 py-8 text-center text-xs text-slate-600 font-mono relative z-10">
        <p>© {new Date().getFullYear()} Fresume — Truth-Grounded AI Resume Builder. All rights reserved.</p>
      </footer>
    </div>
  );
}
