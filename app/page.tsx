"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Sparkles, FileText, CheckCircle2, ShieldCheck, ArrowRight, Layers, LayoutGrid, Clock, Printer, X, RefreshCw } from "lucide-react";

// Score Counter component for animating stats in pipeline strip
function ScoreCounter({ target, active }: { target: number; active: boolean }) {
  const [score, setScore] = useState(0);

  useEffect(() => {
    if (!active) {
      setScore(0);
      return;
    }
    let current = 0;
    const increment = Math.max(1, Math.ceil(target / 15));
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setScore(target);
        clearInterval(timer);
      } else {
        setScore(current);
      }
    }, 40);
    return () => clearInterval(timer);
  }, [target, active]);

  return <span className="font-mono text-4xl md:text-5xl font-bold tracking-tight">{score}</span>;
}

export default function MarketingPage() {
  const [segment, setSegment] = useState<"student" | "professional">("professional");
  const [bulletText, setBulletText] = useState("Helped improve backend performance for the team.");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    rewritten: string;
    grounded: boolean;
    note?: string;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Track hovered state for pipeline strip to trigger score animations
  const [activePipelineStage, setActivePipelineStage] = useState<number | null>(null);
  
  // Track hovered template for showcase swap
  const [hoveredTemplate, setHoveredTemplate] = useState<string | null>(null);
  
  // Track selected template preview modal
  const [previewTemplate, setPreviewTemplate] = useState<string | null>(null);

  const mockResumeData = {
    contact: {
      name: "Aman Sharma",
      title: "Senior Backend Engineer",
      email: "aman.sharma@example.com",
      phone: "+91 98765 43210",
      location: "Bengaluru, India",
      linkedin_url: "linkedin.com/in/amanshar",
      github_url: "github.com/amanshar"
    },
    summary: "High-performance backend specialist with 4+ years of experience refactoring distributed pipelines, reducing latency, and improving database replication query speeds.",
    education: [
      {
        degree: "Bachelor of Technology in Computer Science",
        institution: "Indian Institute of Technology, Madras",
        location: "Chennai, India",
        start_date: "2018",
        end_date: "2022",
        cgpa_or_percentage: "9.2/10 CGPA",
        board_x: "95% (CBSE)",
        board_xii: "98% (CBSE)"
      }
    ],
    experience: [
      {
        title: "Software Engineer",
        org: "Cloudtech Systems",
        location: "Bengaluru, India",
        start_date: "2022",
        end_date: "Present",
        bullets: [
          { text: "Refactored message routing pipelines using Go channels, improving system reliability." },
          { text: "Optimized database query indexes, reducing query response times across three major releases." }
        ]
      }
    ],
    projects: [
      {
        title: "Distributed Ledger Log",
        role: "Lead Creator",
        start_date: "2021",
        end_date: "2022",
        tech_stack: ["Rust", "gRPC", "Docker"],
        bullets: [
          { text: "Designed a replication log with strict consensus checks, ensuring zero message loss." }
        ]
      }
    ],
    skills: {
      technical: ["Go", "Rust", "TypeScript", "PostgreSQL", "Redis"],
      tools: ["Docker", "Kubernetes", "AWS", "GitHub Actions"],
      soft: ["Technical Leadership", "System Architecture"]
    },
    certifications: [
      { name: "AWS Certified Solutions Architect", issuer: "Amazon Web Services", date: "2023" }
    ],
    achievements: [
      { text: "Published: 'Consensus Latency Optimizations in gRPC Clusters' - IEEE Conference 2022", has_metric: true },
      { text: "Awarded Dean's Honor Roll for academic excellence throughout B.Tech program", has_metric: false }
    ],
    segment_fields: {
      dob: "15-08-2000",
      category: "General"
    }
  };

  const renderTemplatePreview = (tmplId: string) => {
    const data = mockResumeData;
    const publications = data.achievements.filter(ach => 
      /publish|paper|journal|thesis|conference|ieee|acm|patent/i.test(ach.text)
    );
    const otherAchievements = data.achievements.filter(ach => 
      !/publish|paper|journal|thesis|conference|ieee|acm|patent/i.test(ach.text)
    );

    switch (tmplId) {
      case "classic":
        return (
          <div style={{ fontFamily: "Georgia, serif", color: "#1e293b" }} className="bg-white border border-slate-200 rounded p-6 text-[9px] leading-normal text-left max-h-96 overflow-y-auto space-y-3 shadow-inner">
            <div className="text-center border-b border-slate-200 pb-2">
              <h4 className="text-sm font-bold text-slate-900">{data.contact.name}</h4>
              <div className="flex justify-center gap-1.5 text-[7.5px] text-slate-400 mt-0.5">
                <span>{data.contact.location}</span>|<span>{data.contact.email}</span>|<span>{data.contact.phone}</span>
              </div>
            </div>
            {data.summary && (
              <div>
                <h5 className="text-[9px] font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-0.5 mb-1">Professional Summary</h5>
                <p className="text-slate-650">{data.summary}</p>
              </div>
            )}
            <div>
              <h5 className="text-[9px] font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-0.5 mb-1">Professional Experience</h5>
              {data.experience.map((exp, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="flex justify-between font-semibold text-slate-900">
                    <span>{exp.title} — {exp.org}</span>
                    <span className="font-normal text-slate-400">{exp.start_date} - {exp.end_date}</span>
                  </div>
                  <ul className="list-disc pl-3 text-slate-700 space-y-0.5">
                    {exp.bullets.map((b, bIdx) => <li key={bIdx}>{b.text}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        );
      case "grotesk":
        return (
          <div style={{ fontFamily: "system-ui, sans-serif", color: "#0f172a" }} className="bg-white border border-slate-200 rounded p-6 text-[9.5px] leading-relaxed text-left max-h-96 overflow-y-auto space-y-3 shadow-inner">
            <div className="border-b border-slate-950 pb-2">
              <h4 className="text-sm font-bold text-slate-900">{data.contact.name}</h4>
              <div className="flex gap-2 text-[8px] text-slate-500 mt-1 font-mono">
                <span>{data.contact.email}</span><span>|</span><span>{data.contact.phone}</span>
              </div>
            </div>
            <div>
              <h5 className="text-[9px] font-bold uppercase tracking-wide text-slate-900 border-l-2 border-slate-900 pl-1.5 mb-1">Technical Skills</h5>
              <div className="text-slate-700"><strong>Tech:</strong> {data.skills.technical.join(", ")} | <strong>Infrastructure:</strong> {data.skills.tools.join(", ")}</div>
            </div>
            <div>
              <h5 className="text-[9px] font-bold uppercase tracking-wide text-slate-900 border-l-2 border-slate-900 pl-1.5 mb-1">Experience</h5>
              {data.experience.map((exp, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="flex justify-between font-bold text-slate-900">
                    <span>{exp.title} at {exp.org}</span>
                    <span className="font-normal text-slate-400">{exp.start_date} - {exp.end_date}</span>
                  </div>
                  <ul className="list-disc pl-3 text-slate-700 space-y-0.5">
                    {exp.bullets.map((b, bIdx) => <li key={bIdx}>{b.text}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        );
      case "campus":
        return (
          <div style={{ fontFamily: "Arial, sans-serif", color: "#1e293b" }} className="bg-white border border-slate-200 rounded p-6 text-[9.5px] leading-normal text-left max-h-96 overflow-y-auto space-y-3 shadow-inner">
            <div className="text-center border-b-2 border-[#1E3A8A] pb-2">
              <h4 className="text-sm font-bold text-[#1E3A8A] uppercase">{data.contact.name}</h4>
              <div className="flex justify-center gap-2 text-[8px] text-blue-800 font-mono mt-1">
                <span>{data.contact.email}</span>|<span>{data.contact.phone}</span>
              </div>
            </div>
            <div>
              <h5 className="text-[9px] font-bold uppercase text-[#1E3A8A] border-b border-blue-100 pb-0.5 mb-1">Education</h5>
              {data.education.map((edu, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between font-bold text-slate-900">
                    <span>{edu.degree} — {edu.institution}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-1 p-1 bg-blue-50/50 border border-blue-100 rounded text-[8px]">
                    <div><strong>Class X Board:</strong> {edu.board_x}</div>
                    <div><strong>Class XII Board:</strong> {edu.board_xii}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-2 bg-slate-50 border border-slate-200 rounded text-[8.5px] text-slate-500 font-mono">
              <strong>Mandatory Declarations:</strong> Campus Recruit Candidate | Trace Verified
            </div>
          </div>
        );
      case "internship":
        return (
          <div style={{ fontFamily: "Helvetica, sans-serif", color: "#1f2937" }} className="bg-white border border-slate-200 rounded p-6 text-[9.5px] leading-normal text-left max-h-96 overflow-y-auto space-y-3 shadow-inner">
            <div className="border-b border-[#3730A3] pb-2">
              <h4 className="text-sm font-bold text-slate-950">{data.contact.name}</h4>
              <p className="text-[8px] text-slate-500 font-mono mt-1">{data.contact.email} | {data.contact.phone}</p>
            </div>
            <div>
              <h5 className="text-[9px] font-bold uppercase text-[#3730A3] border-b border-indigo-100 pb-0.5 mb-1">Education</h5>
              {data.education.map((edu, idx) => (
                <div key={idx} className="flex justify-between font-bold text-slate-900">
                  <span>{edu.degree} ({edu.cgpa_or_percentage})</span>
                </div>
              ))}
            </div>
          </div>
        );
      case "compact":
        return (
          <div style={{ fontFamily: "Arial, sans-serif", color: "#334155" }} className="bg-white border border-slate-200 rounded p-6 text-[8.5px] leading-tight text-left max-h-96 overflow-y-auto space-y-2.5 shadow-inner">
            <div className="flex justify-between items-start border-b border-slate-900 pb-1.5">
              <h4 className="text-xs font-bold text-slate-900">{data.contact.name}</h4>
            </div>
            {data.summary && <p className="text-slate-600 font-sans leading-snug">{data.summary}</p>}
            <div>
              <h5 className="text-[8.5px] font-bold uppercase bg-slate-100 px-1 py-0.5 mb-1 text-slate-900">Experience</h5>
              {data.experience.map((exp, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="flex justify-between font-bold text-slate-900">
                    <span>{exp.title} — {exp.org}</span>
                  </div>
                  <ul className="list-disc pl-3 text-slate-600 space-y-0.5">
                    {exp.bullets.map((b, bIdx) => <li key={bIdx}>{b.text}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        );
      case "academic":
        return (
          <div style={{ fontFamily: "'Times New Roman', Times, serif", color: "#111827" }} className="bg-white border border-slate-200 rounded p-6 text-[10px] leading-relaxed text-left max-h-96 overflow-y-auto space-y-4 shadow-inner">
            <div className="text-center border-b-2 border-gray-950 pb-2">
              <h4 className="text-sm font-bold text-black uppercase">{data.contact.name}</h4>
            </div>
            <div>
              <h5 className="text-[9.5px] font-bold italic text-black border-b border-gray-900 pb-0.5 mb-1">Education</h5>
              {data.education.map((edu, idx) => (
                <div key={idx} className="flex justify-between font-bold text-black">
                  <span>{edu.degree} — {edu.institution}</span>
                </div>
              ))}
            </div>
            {publications.length > 0 && (
              <div>
                <h5 className="text-[9.5px] font-bold italic text-black border-b border-gray-900 pb-0.5 mb-1">Publications</h5>
                <ul className="list-disc pl-3 text-gray-800 space-y-0.5">
                  {publications.map((pub, idx) => <li key={idx}>{pub.text}</li>)}
                </ul>
              </div>
            )}
          </div>
        );
      case "minimal":
        return (
          <div style={{ fontFamily: "Georgia, serif", color: "#334155" }} className="bg-white border border-slate-200 rounded p-6 text-[9.5px] leading-relaxed text-left max-h-96 overflow-y-auto space-y-3.5 shadow-inner">
            <div className="border-l-2 border-[#8A5A34] pl-2.5 py-0.5">
              <h4 className="text-sm font-light uppercase tracking-widest text-[#8A5A34]">{data.contact.name}</h4>
            </div>
            <div>
              <h5 className="text-[9px] font-semibold uppercase tracking-widest text-[#8A5A34] flex items-center gap-1.5 mb-1">
                <span className="w-1 h-1 bg-[#8A5A34] rounded-full"></span>Technical Stack
              </h5>
              <p className="text-slate-600 pl-2"><strong>Core:</strong> {data.skills.technical.join(", ")}</p>
            </div>
          </div>
        );
      case "fresher-psu":
        return (
          <div style={{ fontFamily: "Arial, sans-serif", color: "#000" }} className="bg-white border border-slate-200 rounded p-6 text-[9.5px] leading-normal text-left max-h-96 overflow-y-auto space-y-3 shadow-inner">
            <div className="border border-black p-2.5 flex justify-between items-start">
              <div>
                <h4 className="text-sm font-bold uppercase text-black">{data.contact.name}</h4>
              </div>
              <div className="w-14 h-16 border border-black bg-gray-150 flex flex-col items-center justify-center p-1 text-center text-[5px] font-mono text-gray-500 uppercase tracking-tighter shrink-0 ml-2 font-bold">
                <span>PHOTO</span>
              </div>
            </div>
            <div className="border border-black p-2 bg-gray-50 text-[8.5px]">
              <strong>Declarations:</strong> DOB: {data.segment_fields?.dob} | Category: {data.segment_fields?.category}
            </div>
            <div>
              <h5 className="text-[9px] font-bold uppercase tracking-wide bg-gray-200 border-b border-black py-0.5 px-1.5 text-center mb-1">Academic Records</h5>
              {data.education.map((edu, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between font-bold">
                    <span>{edu.degree} — {edu.institution}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  // Default bullets for segment changes
  useEffect(() => {
    if (segment === "student") {
      setBulletText("Worked on a project for my final year submission.");
    } else {
      setBulletText("Helped improve backend performance for the team.");
    }
    setResult(null);
    setErrorMsg(null);
  }, [segment]);

  const handleRewrite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulletText.trim()) return;
    setLoading(true);
    setErrorMsg(null);
    setResult(null);

    try {
      const response = await fetch("/api/demo-rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bulletText })
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorMsg(data.error || "Failed to process rewrite.");
      } else {
        setResult({
          rewritten: data.rewritten,
          grounded: data.grounded,
          note: data.note
        });
      }
    } catch (err: any) {
      setErrorMsg("Connection issue. Please verify your internet connection.");
    } finally {
      setLoading(false);
    }
  };

  const templates = [
    { id: "classic", label: "Classic Professional", sub: "Standard, corporate roles (Finance, Sales, Ops)", target: "Corporate Professionals", style: "font-serif text-slate-800 text-[10px] text-center border-t border-slate-300 pt-3" },
    { id: "grotesk", label: "Modern Grotesk", sub: "Tech, software engineering, and creative startups", target: "Tech & Creatives", style: "font-mono text-slate-900 text-[9px] uppercase border-l-2 border-blue-500 pl-3 tracking-tighter" },
    { id: "campus", label: "Campus Fresher (IN)", sub: "Indian student CGPA, course work & XII/X boards", target: "Indian Undergrads", style: "font-sans font-medium text-slate-800 text-[9.5px] border border-slate-200 p-2.5 rounded bg-slate-50" },
    { id: "internship", label: "Internship/Fresher Intl.", sub: "Student roles, project-centric layout with no boards", target: "International Students", style: "font-sans text-slate-700 text-[10px] tracking-wide border-b border-dashed border-slate-300 pb-1" },
    { id: "compact", label: "Executive Compact", sub: "Dense layout optimized for 5+ years of experience", target: "Senior Executives", style: "font-sans text-slate-900 text-[8.5px] leading-snug font-light tracking-tight border border-slate-350 p-2" },
    { id: "academic", label: "Academic/Research", sub: "Expanded CV style for publications & research logs", target: "Researchers & Academics", style: "font-serif italic text-slate-800 text-[9.5px] leading-relaxed border-t border-b border-double border-slate-400 py-1.5" },
    { id: "minimal", label: "Structured Minimal", sub: "Clean design-adjacent with fine accent highlights", target: "Designers & Product managers", style: "font-sans text-slate-600 text-[9px] pl-3 border-l border-slate-900 italic" },
    { id: "fresher-psu", label: "Formal/PSU (IN)", sub: "Government jobs requiring passport photo box", target: "PSU & Government applicants", style: "font-sans text-slate-950 text-[9px] border-2 border-slate-900 p-3 font-bold uppercase tracking-wider text-center" },
  ];

  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen flex flex-col font-sans overflow-hidden relative">
      {/* Background gradients */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] bg-indigo-600/5 rounded-full blur-[140px] pointer-events-none"></div>


      {/* Hero Section */}
      <section className="max-w-4xl mx-auto px-6 pt-16 pb-12 text-center space-y-8 relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full text-xs font-mono font-medium animate-pulse">
          <Sparkles size={12} />
          <span>Real-time Anti-Hallucination Sandbox</span>
        </div>
        
        <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight text-white max-w-3xl mx-auto leading-tight">
          Every resume tool promises AI magic. Ours refuses to make things up.
        </h1>
        
        <p className="text-sm md:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Fresume rewrites what you actually did — it never invents a metric you didn&apos;t give it. Try it below, right now, on a real line from your resume.
        </p>

        {/* Live Interactive Demo Box */}
        <div className="max-w-2xl mx-auto bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 text-left">
          <form onSubmit={handleRewrite} className="space-y-4">
            <div className="relative">
              <textarea
                value={bulletText}
                onChange={(e) => setBulletText(e.target.value.slice(0, 280))}
                placeholder="Enter a line from your resume..."
                className="w-full h-24 p-4 bg-slate-950/80 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500 transition-all resize-none leading-relaxed"
                maxLength={280}
              />
              <div className="absolute bottom-3 right-3 text-[10px] font-mono text-slate-500">
                {bulletText.length} / 280
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !bulletText.trim()}
              className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg font-mono text-xs font-semibold shadow-lg shadow-blue-500/15 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <RefreshCw className="animate-spin" size={12} />
                  <span>Invoking Gemini Auditing Engine...</span>
                </>
              ) : (
                <>
                  <span>Rewrite this</span>
                  <ArrowRight size={12} />
                </>
              )}
            </button>
          </form>

          {/* SKELETON LOADING STATE */}
          {loading && (
            <div className="border border-slate-800 rounded-xl p-4 bg-slate-950/40 space-y-2.5 animate-pulse">
              <div className="h-3 bg-slate-800 rounded w-1/3"></div>
              <div className="h-4 bg-slate-800 rounded w-full"></div>
              <div className="h-3 bg-slate-800 rounded w-2/3"></div>
            </div>
          )}

          {/* ERROR HANDLING (Rate limits etc.) */}
          {errorMsg && (
            <div className="border border-red-500/20 bg-red-500/5 rounded-xl p-4 space-y-3 font-mono text-xs leading-relaxed">
              <p className="text-red-400">{errorMsg}</p>
              {errorMsg.includes("limit") && (
                <Link
                  href="/app"
                  className="inline-flex items-center gap-1.5 text-blue-400 hover:text-blue-300 font-bold underline"
                >
                  <span>Sign up free to keep going</span>
                  <ArrowRight size={12} />
                </Link>
              )}
            </div>
          )}

          {/* RESPONSE RENDERER INLINE */}
          {result && (
            <div className="relative pt-4 flex flex-col space-y-2">
              {/* Trace-mark connecting line */}
              <div className={`absolute top-0 left-6 bottom-0 w-[1px] ${result.grounded ? 'bg-amber-500/40' : 'bg-red-500/40'} z-0`}></div>

              <div className="flex gap-4 items-start relative z-10">
                {/* Dot */}
                <div className={`w-3 h-3 rounded-full mt-2 shrink-0 border-2 ${result.grounded ? 'bg-amber-500 border-slate-950' : 'bg-red-500 border-slate-950'}`}></div>
                
                <div className="flex-1 space-y-2.5">
                  <div className="flex flex-wrap gap-2 items-center">
                    {result.grounded ? (
                      <span className="text-[9px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded uppercase tracking-wider font-semibold">
                        Grounded in what you wrote
                      </span>
                    ) : (
                      <span className="text-[9px] font-mono text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded uppercase tracking-wider font-semibold">
                        No metric provided — none invented
                      </span>
                    )}
                  </div>
                  
                  <div className="bg-slate-950/80 border border-slate-850 p-4 rounded-xl space-y-2">
                    <p className="text-xs text-slate-200 font-mono leading-relaxed">&ldquo;{result.rewritten}&rdquo;</p>
                    {result.note && (
                      <p className="text-[10px] text-slate-400 leading-normal font-sans italic border-t border-slate-900 pt-2">
                        💡 {result.note}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <p className="text-[10px] text-slate-500 font-mono text-center pt-2">
            This is what Fix does inside Fresume — normally part of the ₹20 session pass. You just got a free preview.
          </p>
        </div>
      </section>

      {/* Segment Toggle directly under Hero */}
      <section className="max-w-md mx-auto px-6 py-6 text-center space-y-4 relative z-10">
        <div className="inline-flex p-1 bg-slate-900 border border-slate-800 rounded-xl">
          <button
            onClick={() => setSegment("professional")}
            className={`px-4 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
              segment === "professional" ? "bg-blue-600 text-white shadow" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            I&apos;m a professional
          </button>
          <button
            onClick={() => setSegment("student")}
            className={`px-4 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
              segment === "student" ? "bg-blue-600 text-white shadow" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            I&apos;m a student
          </button>
        </div>
        <p className="text-xs font-mono text-slate-400">
          {segment === "student" 
            ? "Turn coursework and projects into resume-ready achievements." 
            : "Tailor your resume to a specific job description in minutes."}
        </p>
      </section>

      {/* How it Works - Interactive Pipeline Strip */}
      <section 
        className="max-w-6xl mx-auto px-6 py-20 border-t border-slate-900 relative z-10 w-full"
        onMouseEnter={() => setActivePipelineStage(99)} // activates all when entering section
        onMouseLeave={() => setActivePipelineStage(null)}
      >
        <div className="text-center space-y-3 mb-16">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-white">The Truth-Grounded Pipeline</h2>
          <p className="text-xs text-slate-400 max-w-lg mx-auto font-mono">
            Hover over a stage to see the score change and audits run.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connecting line (Desktop) */}
          <div className="hidden md:block absolute top-1/2 left-[15%] right-[15%] h-[1px] bg-gradient-to-r from-blue-500/20 via-indigo-500/20 to-slate-800/20 -translate-y-1/2 pointer-events-none z-0"></div>

          {/* Stage 1: Analyze */}
          <div 
            onMouseEnter={() => setActivePipelineStage(1)}
            className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-6 rounded-2xl relative z-10 space-y-4 hover:border-blue-500/40 transition-all group cursor-pointer"
          >
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                <FileText size={20} />
              </div>
              <ScoreCounter target={54} active={activePipelineStage === 1 || activePipelineStage === 99} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition-all">1. Analyze</h3>
                <span className="text-[8px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded font-semibold">FREE</span>
              </div>
              <p className="text-[10px] font-mono text-slate-500 mt-0.5 uppercase tracking-wider">ATS Score Scan</p>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              3 findings flagged, including 2 bullets with no measurable outcome.
            </p>
          </div>

          {/* Stage 2: Fix */}
          <div 
            onMouseEnter={() => setActivePipelineStage(2)}
            className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-6 rounded-2xl relative z-10 space-y-4 hover:border-indigo-500/40 transition-all group cursor-pointer"
          >
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <Layers size={20} />
              </div>
              <ScoreCounter target={71} active={activePipelineStage === 2 || activePipelineStage === 99} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white group-hover:text-indigo-400 transition-all">2. Fix</h3>
                <span className="text-[8px] font-mono text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded font-semibold">₹20 PASS</span>
              </div>
              <p className="text-[10px] font-mono text-slate-500 mt-0.5 uppercase tracking-wider">AI Grounded Auditing</p>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              AI rewrote 2 bullets — grounded, no invented numbers.
            </p>
          </div>

          {/* Stage 3: Generate */}
          <div 
            onMouseEnter={() => setActivePipelineStage(3)}
            className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-6 rounded-2xl relative z-10 space-y-4 hover:border-amber-500/40 transition-all group cursor-pointer"
          >
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                <Printer size={20} />
              </div>
              <ScoreCounter target={89} active={activePipelineStage === 3 || activePipelineStage === 99} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white group-hover:text-amber-400 transition-all">3. Generate</h3>
                <span className="text-[8px] font-mono text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded font-semibold">₹20 PASS</span>
              </div>
              <p className="text-[10px] font-mono text-slate-500 mt-0.5 uppercase tracking-wider">ATS-Guaranteed Compiler</p>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Exported ATS-safe PDF, parseability confirmed.
            </p>
          </div>
        </div>
      </section>

      {/* Template Showcase - Interactive layout modal on click */}
      <section className="max-w-6xl mx-auto px-6 py-20 border-t border-slate-900 relative z-10 w-full">
        <div className="text-center space-y-3 mb-16">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-white">8 ATS-Guaranteed Layouts</h2>
          <p className="text-xs text-slate-400 max-w-lg mx-auto font-mono">
            Click a template card below to open its design preview showing a complete mock resume layout.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {templates.map((tmpl) => (
            <div
              key={tmpl.id}
              onClick={() => setPreviewTemplate(tmpl.id)}
              className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-5 rounded-xl transition-all hover:border-slate-700 min-h-48 flex flex-col justify-between group cursor-pointer"
            >
              <div className="flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <span className="text-[8px] font-mono text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold">
                    {tmpl.target}
                  </span>
                  <h3 className="text-sm font-bold text-white font-body group-hover:text-blue-400 transition-all">
                    {tmpl.label}
                  </h3>
                  <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                    {tmpl.sub}
                  </p>
                </div>
                <span className="text-[10px] font-mono text-blue-400 flex items-center gap-1">
                  <span>Click to preview layout</span>
                  <ArrowRight size={10} className="group-hover:translate-x-1 transition-transform" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Trust Section - Ledger excerpt */}
      <section className="max-w-6xl mx-auto px-6 py-20 border-t border-slate-900 relative z-10 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6 text-left">
            <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl flex items-center justify-center">
              <ShieldCheck size={24} />
            </div>
            
            <h2 className="font-display text-3xl md:text-4xl font-bold text-white leading-tight">
              Anti-Hallucination: AI Grounding Guard
            </h2>

            <p className="text-xs font-mono uppercase tracking-widest text-slate-500">
              Nothing gets added that you didn&apos;t put there first.
            </p>

            <p className="text-sm text-slate-400 leading-relaxed font-sans">
              Unlike generic AI writers that fabricate fake numbers to inflate scores (e.g. claiming you &ldquo;saved $10M&rdquo; out of nowhere), Fresume maintains a strict **evidence constraint**. 
            </p>
            
            <p className="text-sm text-slate-400 leading-relaxed font-sans">
              Our AI rewrite assistant will help you structure sentences using strong action verbs and professional style guidelines, but it **strictly rejects inventing metrics**. If a metric is missing, Fresume guides you to provide real data points, keeping your resume 100% audit-safe and truthful.
            </p>
          </div>

          {/* Terminal styled Chain-of-Custody log */}
          <div className="bg-slate-950 border border-slate-800 p-6 rounded-2xl space-y-4 shadow-2xl relative">
            <div className="flex justify-between items-center border-b border-slate-900 pb-3">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/60"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/60"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60"></div>
              </div>
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Groundwork Audit Trail</span>
            </div>

            <div className="font-mono text-[10px] text-slate-400 leading-relaxed space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-slate-600 font-bold">line_042</span>
                <span className="text-blue-400">&rarr;</span>
                <span>user-provided: <span className="text-slate-300">&ldquo;Optimized database speeds.&rdquo;</span></span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-slate-600 font-bold">line_042</span>
                <span className="text-blue-400">&rarr;</span>
                <span>ai-rewrite-of:line_042 <span className="text-red-400 font-semibold bg-red-500/10 px-1 border border-red-500/20 rounded">(rejected: unverified metric &ldquo;40%&rdquo;)</span></span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-slate-600 font-bold">line_042</span>
                <span className="text-blue-400">&rarr;</span>
                <span>ai-rewrite-of:line_042 <span className="text-emerald-400 font-semibold bg-emerald-500/10 px-1 border border-emerald-500/20 rounded">(approved: verb strengthened, no new numbers)</span></span>
              </div>
              <div className="flex items-start gap-2 border-t border-slate-900 pt-2 mt-2">
                <span className="text-slate-600 font-bold">line_042</span>
                <span className="text-blue-400">&rarr;</span>
                <span>user-edited-manual: <span className="text-emerald-400">&ldquo;Refactored index strategies, reducing query lookup times by 3 releases.&rdquo;</span></span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="max-w-6xl mx-auto px-6 py-20 border-t border-slate-900 relative z-10 w-full text-center">
        <div className="text-center space-y-3 mb-16">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-white">Transparent Pay-Per-Use Pricing</h2>
          <p className="text-xs text-slate-400 max-w-lg mx-auto font-mono">
            Free to analyze. ₹20 unlocks AI rewrites and export — one single session pass, no subscription.
          </p>
        </div>

        <div className="max-w-lg mx-auto bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6 text-center">
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
            Run a full ATS scan and see every finding for free. When you&apos;re ready to fix and export, ₹20 unlocks AI-grounded rewrites, the guided wizard, and all 8 templates for that session — no recurring charge.
          </p>

          <p className="text-xs text-amber-500 font-mono italic">
            Most resume tools lock you into a monthly plan or a trial that quietly renews at a much higher price. Fresume doesn&apos;t.
          </p>

          <div className="border-t border-slate-800 pt-4 text-left space-y-3 text-xs font-mono">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">ATS Rubric Compliance Score</span>
              <span className="text-emerald-400 font-bold">100% Free</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Verbs & Quantitative Density Gaps List</span>
              <span className="text-emerald-400 font-bold">100% Free</span>
            </div>
            <div className="flex items-center justify-between border-t border-slate-850 pt-2">
              <span className="text-slate-300">Interactive Line-Editor Rewriter</span>
              <span className="text-blue-400">Requires ₹20 Pass</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-300">PDF, Word (DOCX) & Plaintext Compilers</span>
              <span className="text-blue-400">Requires ₹20 Pass</span>
            </div>
          </div>

          <Link
            href="/app"
            className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg font-mono text-sm font-bold shadow-lg shadow-blue-500/10 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Analyze your resume free</span>
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
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
            >
              <X size={20} />
            </button>
            <div className="space-y-1 text-left">
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
              <p className="text-[10px] text-slate-500 font-mono text-left">
                * Note: Displays clean ATS-optimized rendering with no watermark tags.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPreviewTemplate(null)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200 font-mono transition-all cursor-pointer"
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
