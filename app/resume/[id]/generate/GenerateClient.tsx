"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect } from "react";
import { Database, supabase } from "../../../../lib/supabase";
import { Resume, Bullet, Education, Experience, Project, Certification, ExportRecord, ResumeData } from "../../../../lib/schema";
import { auditChainOfCustody, AuditResult } from "../../../../lib/audit";
import { 
  ArrowLeft, Download, Eye, FileText, Check, AlertTriangle, Play, CheckCircle2, ShieldCheck, RefreshCw, Sparkles, Languages, Printer
} from "lucide-react";
import Link from "next/link";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function GeneratePage({ params }: PageProps) {
  const resolvedParams = params && (typeof (params as any).then === "function" || params instanceof Promise)
    ? React.use(params)
    : (params as any);
  const id = resolvedParams?.id || "";
  const [resume, setResume] = useState<Resume | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState("classic");
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [atsReport, setAtsReport] = useState<{
    overallPass: boolean;
    foundCount: number;
    totalCount: number;
    fieldsFound: string[];
    fieldsNotFound: string[];
  } | null>(null);
  
  const [exporting, setExporting] = useState(false);
  const [exportsHistory, setExportsHistory] = useState<ExportRecord[]>([]);

  const loadExportsHistory = () => {
    Database.getExports(id).then(history => {
      setExportsHistory(history);
    }).catch(err => {
      console.warn("Failed to retrieve exports history:", err);
    });
  };

  useEffect(() => {
    // 1. Verify active single-session pass
    if (supabase) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (!user) {
          window.location.href = "/app";
          return;
        }
        supabase.from("subscriptions").select("*").eq("user_id", user.id).maybeSingle().then(({ data: subData }) => {
          const isPro = subData?.tier === "pro" && subData?.status === "active";
          if (!isPro) {
            window.location.href = "/app?paywall=true";
          }
        });
      }).catch(() => {
        window.location.href = "/app";
      });
    } else {
      window.location.href = "/app";
      return;
    }

    // 2. Fetch resume details
    Database.getResumeById(id).then(data => {
      if (data) {
        setResume(data);
        // Run provenance audit
        const audit = auditChainOfCustody(data.resume_data);
        setAuditResult(audit);
        
        // Select appropriate default template based on career segment
        if (data.resume_data.segment_fields.segment === "student") {
          setSelectedTemplate(data.resume_data.segment_fields.target_market === "india_campus" ? "campus" : "internship");
        } else {
          setSelectedTemplate("classic");
        }
      }
    }).catch(err => {
      console.error(err);
      window.location.href = "/";
    });
    loadExportsHistory();
  }, [id]);

  const logExport = async (format: "pdf" | "docx" | "txt") => {
    try {
      await Database.saveExport({
        resume_id: id,
        format,
        parseability_report: atsReport || undefined,
        file_url: `/exports/${resume?.id}_${format}_${Date.now()}`
      });
      loadExportsHistory();

      // Auto-expire subscription on download client-side
      if (supabase && resume?.user_id) {
        await supabase
          .from("subscriptions")
          .update({ status: "expired" })
          .eq("user_id", resume.user_id);
      }

      // Redirect after short delay to allow file stream to load
      setTimeout(() => {
        window.location.href = "/?session_completed=true";
      }, 1500);
    } catch (err) {
      console.error("Failed to save export log:", err);
    }
  };

  // Run ATS Parseability proof simulation
  useEffect(() => {
    if (!resume) return;
    simulateAtsParser();
  }, [resume, selectedTemplate]);

  const simulateAtsParser = () => {
    if (!resume) return;
    const data = resume.resume_data;
    const found: string[] = [];
    const missing: string[] = [];

    // Simulate basic ATS parser extracting and trying to map fields
    if (data.contact.name) found.push("Full Name");
    else missing.push("Full Name");

    if (data.contact.email && data.contact.email.includes("@")) found.push("Email");
    else missing.push("Email");

    if (data.contact.phone) found.push("Phone");
    else missing.push("Phone");

    if (data.contact.location) found.push("Location");
    else missing.push("Location");

    // Sections
    if (data.education.length > 0) found.push("Education Section");
    else missing.push("Education Section");

    const isStudent = data.segment_fields.segment === "student";
    if (isStudent) {
      if (data.projects.length > 0) found.push("Projects Section");
      else missing.push("Projects Section");
    } else {
      if (data.experience.length > 0) found.push("Experience Section");
      else missing.push("Experience Section");
    }

    // Checking if bullet layouts or font-style could throw off parser (for specific template)
    if (selectedTemplate === "fresher-psu" && data.segment_fields.photo_required) {
      missing.push("Photo Area Text (Rasterized blocks are unparseable)");
    }

    const totalCount = found.length + missing.length;
    setAtsReport({
      overallPass: missing.length === 0,
      foundCount: found.length,
      totalCount,
      fieldsFound: found,
      fieldsNotFound: missing
    });
  };

  const handleDownloadPlaintext = async () => {
    if (!resume) return;
    try {
      const response = await fetch("/api/txt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          resumeId: id,
          userId: resume.user_id
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 403 || errorData.limitExceeded) {
          alert(errorData.error || "Payment required: You need to pay ₹20 for one-time access to export this resume.");
        } else {
          alert(errorData.error || "Failed to download plaintext resume.");
        }
        return;
      }

      const data = resume.resume_data;
      
      // Construct simple Plaintext resume
      let txt = `==================================================\n`;
      txt += `${data.contact.name.toUpperCase()}\n`;
      txt += `${data.contact.location} | ${data.contact.phone} | ${data.contact.email}\n`;
      if (data.contact.linkedin_url) txt += `LinkedIn: ${data.contact.linkedin_url}\n`;
      if (data.contact.github_url) txt += `GitHub: ${data.contact.github_url}\n`;
      txt += `==================================================\n\n`;

      txt += `SUMMARY\n-------\n${data.summary}\n\n`;

      if (data.experience.length > 0) {
        txt += `PROFESSIONAL EXPERIENCE\n-----------------------\n`;
        data.experience.forEach(exp => {
          txt += `${exp.title} | ${exp.org} | ${exp.location}\n`;
          txt += `${exp.start_date} - ${exp.end_date}\n`;
          exp.bullets.forEach(b => {
            txt += `• ${b.text}\n`;
          });
          txt += `\n`;
        });
      }

      if (data.projects.length > 0) {
        txt += `ACADEMIC PROJECTS\n-----------------\n`;
        data.projects.forEach(proj => {
          txt += `${proj.title} | ${proj.role}\n`;
          txt += `Technologies: ${proj.tech_stack.join(", ")}\n`;
          proj.bullets.forEach(b => {
            txt += `• ${b.text}\n`;
          });
          txt += `\n`;
        });
      }

      txt += `TECHNICAL SKILLS\n----------------\n`;
      txt += `Languages/Core: ${data.skills.technical.join(", ")}\n`;
      txt += `Tools/Infrastructure: ${data.skills.tools.join(", ")}\n`;
      txt += `Soft Skills: ${data.skills.soft.join(", ")}\n\n`;

      txt += `EDUCATION\n---------\n`;
      data.education.forEach(edu => {
        txt += `${edu.degree} - ${edu.institution}\n`;
        txt += `${edu.start_date} - ${edu.end_date} | Grade: ${edu.cgpa_or_percentage}\n`;
        if (edu.board_x) txt += `Board: ${edu.board_x} / XII: ${edu.board_xii}\n`;
        txt += `\n`;
      });

      // Create file trigger download
      const blob = new Blob([txt], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${data.contact.name.replace(/\s+/g, "_")}_ATS_Plaintext.txt`;
      a.click();
      logExport("txt");
    } catch (err) {
      console.error(err);
      alert("Error checking export limits or exporting plaintext.");
    }
  };

  const handleDownloadDocx = async () => {
    if (!resume) return;
    try {
      const response = await fetch("/api/docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          resumeData: resume.resume_data,
          resumeId: id,
          userId: resume.user_id
        }),
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const name = resume.resume_data.contact.name || "Resume";
        a.download = `${name.replace(/\s+/g, "_")}_Fresume_Export.doc`;
        a.click();
        logExport("docx");
      } else {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 403 || errorData.limitExceeded) {
          alert(errorData.error || "Payment required: You need to pay ₹20 for one-time access to export this resume.");
        } else {
          alert(errorData.error || "Failed to compile Word document.");
        }
      }
    } catch (err) {
      console.error(err);
      alert("Error compiling Word document.");
    }
  };

  const handlePrintPDF = () => {
    logExport("pdf");
    window.print();
  };

  if (!resume) return <div className="p-8 text-center font-mono">Loading ledger...</div>;

  const data = resume.resume_data;
  const isCompact = selectedTemplate === "compact";

  return (
    <div className="max-w-7xl mx-auto w-full px-6 py-8 flex-1 flex flex-col justify-start">
      {/* Navigation and Title */}
      <div className="flex justify-between items-center mb-6">
        <Link href={`/resume/${id}/fix`} className="text-xs font-mono text-ink/60 hover:text-ink flex items-center gap-1">
          <ArrowLeft size={12} />
          <span>Back to Fix Ledger</span>
        </Link>
        <span className="text-xs font-mono text-ink/40">Step 3 of 3: Generate Document</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* LEFT PANEL: TEMPLATES PICKER & DOWNLOAD ACTIONS */}
        <div className="space-y-6">
          <div className="bg-surface border border-line p-5 rounded-lg space-y-4">
            <h2 className="font-display text-lg font-bold text-ink">1. Pick Design Template</h2>
            <p className="text-xs text-ink/60 font-body leading-relaxed">
              Choose from 8 single-column, ATS-guaranteed designs. The selected style carries no Groundwork branding, ensuring immediate industry compliance.
            </p>

            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
              {[
                { id: "classic", label: "Classic Professional", sub: "Standard, corporate" },
                { id: "grotesk", label: "Modern Grotesk", sub: "Tech, startup, skills-forward" },
                { id: "campus", label: "Campus Fresher (IN)", sub: "Student CGPA, IIT/NIT style" },
                { id: "internship", label: "Internship/Fresher International", sub: "No board details" },
                { id: "compact", label: "Executive Compact", sub: "Dense, 5+ yrs experience" },
                { id: "academic", label: "Academic/Research", sub: "Expanded CV style" },
                { id: "minimal", label: "Structured Minimal", sub: "Design-adjacent, accent" },
                { id: "fresher-psu", label: "Formal/PSU (IN)", sub: "Government required photo" },
              ].map((tmpl) => (
                <button
                  key={tmpl.id}
                  onClick={() => setSelectedTemplate(tmpl.id)}
                  className={`p-3 text-left border rounded-md transition ${selectedTemplate === tmpl.id ? 'border-signal bg-signal/5 text-signal' : 'border-line hover:bg-paper/40 text-ink/80'}`}
                >
                  <span className="font-semibold text-xs font-body block">{tmpl.label}</span>
                  <span className="text-[10px] font-mono text-ink/50 block mt-0.5">{tmpl.sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Export Actions */}
          <div className="bg-surface border border-line p-5 rounded-lg space-y-3">
            <h3 className="font-display text-md font-bold text-ink">2. Export Document</h3>
            <button 
              onClick={handlePrintPDF}
              className="w-full py-2 bg-signal text-white rounded font-mono text-xs font-semibold hover:opacity-95 transition flex items-center justify-center gap-2"
            >
              <Printer size={14} />
              <span>Print / Download PDF</span>
            </button>
            <button 
              onClick={handleDownloadDocx}
              className="w-full py-2 border border-line hover:bg-paper rounded font-mono text-xs text-ink/80 transition flex items-center justify-center gap-2"
            >
              <FileText size={14} />
              <span>Download Word (DOCX)</span>
            </button>
            <button 
              onClick={handleDownloadPlaintext}
              className="w-full py-2 border border-line hover:bg-paper rounded font-mono text-xs text-ink/80 transition flex items-center justify-center gap-2"
            >
              <FileText size={14} />
              <span>Plaintext ATS Copy (.txt)</span>
            </button>
          </div>

          {/* Recent Exports History */}
          <div className="bg-surface border border-line p-5 rounded-lg space-y-3">
            <h3 className="font-display text-md font-bold text-ink">3. Recent Exports History</h3>
            <p className="text-xs text-ink/60 font-body leading-relaxed">
              Every document you export or print is logged here with its corresponding ATS parseability status.
            </p>
            {exportsHistory.length === 0 ? (
              <p className="text-[10px] font-mono text-ink/40 italic">No previous exports found for this resume.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {exportsHistory.map((exp) => {
                  const dateStr = exp.created_at ? new Date(exp.created_at).toLocaleString() : "Unknown date";
                  const pRep = exp.parseability_report;
                  return (
                    <div key={exp.id} className="border border-line/50 p-2 rounded bg-paper/25 text-[10px] font-mono space-y-1">
                      <div className="flex justify-between font-bold text-ink/80">
                        <span className="uppercase">{exp.format} Document</span>
                        <span className="text-ink/40">{dateStr}</span>
                      </div>
                      {pRep && (
                        <div className="flex justify-between text-[9px] text-ink/60 border-t border-line/30 pt-1 mt-1">
                          <span>ATS Fields Found: {pRep.foundCount}/{pRep.totalCount}</span>
                          <span className={pRep.overallPass ? "text-evidence font-bold" : "text-signal font-bold"}>
                            {pRep.overallPass ? "✓ FULLY PARSEABLE" : "⚠️ PARSEABILITY WARNING"}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* PROMPT 10: CHAIN-OF-CUSTODY AUDIT PANEL */}
          {auditResult && (
            <div className={`border p-5 rounded-lg space-y-3 ${auditResult.passed ? 'bg-evidence/5 border-evidence/20' : 'bg-caution/5 border-caution/20'}`}>
              <div className="flex gap-2 items-center">
                <ShieldCheck className="text-evidence" size={18} />
                <h4 className="font-display text-sm font-bold text-ink">Chain-of-Custody Provenance</h4>
              </div>
              <p className="text-[11px] font-body text-ink/70 leading-relaxed">
                Groundwork trace-audits every achievement's modifications to protect against untraceable AI hallucinations.
              </p>

              <div className="space-y-1.5 pt-1">
                {auditResult.auditedBullets.map((ab, idx) => (
                  <div key={idx} className="flex justify-between items-center text-[10px] font-mono p-1 border border-line/30 bg-surface rounded">
                    <span className="truncate max-w-xs">"{ab.text}"</span>
                    <span className={`px-1 rounded uppercase tracking-wider text-[8px] font-bold ${ab.isGrounded ? 'bg-evidence/20 text-evidence' : 'bg-caution/20 text-caution'}`}>
                      {ab.chain[0]}
                    </span>
                  </div>
                ))}
              </div>
              
              <div className="p-2 bg-surface/50 border border-line rounded text-[10px] font-mono text-ink/60">
                Overall Proof Status: <span className="font-bold text-evidence">{auditResult.passed ? "✓ GROUNDED HUMAN LINEAGE VERIFIED" : "⚠️ UNGROUNDED CONTENT DETECTED"}</span>
              </div>
            </div>
          )}
        </div>

        {/* MIDDLE & RIGHT PANEL: LIVE PREVIEW & ATS PROOF */}
        <div className="lg:col-span-2 space-y-6">
          {/* ATS Parseability Report */}
          {atsReport && (
            <div className="bg-surface border border-line p-5 rounded-lg flex flex-col md:flex-row gap-6">
              <div className="shrink-0 flex flex-col items-center justify-center bg-paper border border-line rounded-md p-4 w-32">
                <span className="text-[10px] font-mono text-ink/40 uppercase">ATS Proof</span>
                <span className="font-display text-4xl font-bold tracking-tight text-ink mt-1">
                  {Math.round((atsReport.foundCount / atsReport.totalCount) * 100)}%
                </span>
                <span className="text-[10px] font-mono text-ink/60 mt-1">
                  {atsReport.foundCount}/{atsReport.totalCount} Map elements
                </span>
              </div>

              <div className="flex-1 space-y-2">
                <h3 className="font-display text-sm font-bold text-ink">Simulated ATS Plain-Text Extraction</h3>
                <p className="text-xs text-ink/60 font-body leading-relaxed">
                  Below are the results of a plain text extractor running on your formatted design. Green items indicate standard fields extracted successfully.
                </p>
                <div className="flex gap-2 flex-wrap pt-2">
                  {atsReport.fieldsFound.map(f => (
                    <span key={f} className="font-mono text-[9px] bg-evidence/10 text-evidence border border-evidence/20 rounded px-1.5 py-0.5">
                      ✓ {f}
                    </span>
                  ))}
                  {atsReport.fieldsNotFound.map(f => (
                    <span key={f} className="font-mono text-[9px] bg-caution/10 text-caution border border-caution/20 rounded px-1.5 py-0.5">
                      ⚠️ Missing: {f}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* DYNAMIC WHITE CANVAS RESUME PREVIEW (No Groundwork Branding) */}
          <div className="bg-white border border-line rounded-lg shadow-md p-10 min-h-[1100px] text-slate-800 print:p-0 print:border-none print:shadow-none text-left">
            <style jsx>{`
              @media print {
                body * {
                  visibility: hidden;
                }
                #printable-area, #printable-area * {
                  visibility: visible;
                }
                #printable-area {
                  position: absolute;
                  left: 0;
                  top: 0;
                }
              }
            `}</style>
            
            <div id="printable-area" className="w-full">
              {selectedTemplate === "classic" && renderClassic(data)}
              {selectedTemplate === "grotesk" && renderGrotesk(data)}
              {selectedTemplate === "campus" && renderCampus(data)}
              {selectedTemplate === "internship" && renderInternship(data)}
              {selectedTemplate === "compact" && renderCompact(data)}
              {selectedTemplate === "academic" && renderAcademic(data)}
              {selectedTemplate === "minimal" && renderMinimal(data)}
              {selectedTemplate === "fresher-psu" && renderPSU(data)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 8 DISTINCT SINGLE-COLUMN RESUME TEMPLATES
// ==========================================

const renderClassic = (data: ResumeData) => {
  return (
    <div style={{ fontFamily: "Georgia, serif", color: "#1e293b" }} className="space-y-5 text-xs leading-normal">
      {/* Header */}
      <div className="text-center border-b border-slate-200 pb-3">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{data.contact.name}</h1>
        <div className="flex justify-center gap-x-2.5 text-[9px] text-slate-400 mt-1">
          <span>{data.contact.location}</span><span>|</span>
          <span>{data.contact.phone}</span><span>|</span>
          <span>{data.contact.email}</span>
        </div>
        {(data.contact.linkedin_url || data.contact.github_url) && (
          <div className="flex justify-center gap-x-3 text-[9px] text-slate-400 mt-0.5">
            {data.contact.linkedin_url && <span>LinkedIn: {data.contact.linkedin_url}</span>}
            {data.contact.github_url && <span>GitHub: {data.contact.github_url}</span>}
          </div>
        )}
      </div>
      
      {/* Summary */}
      {data.summary && (
        <div className="space-y-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-250 pb-0.5">Professional Summary</h2>
          <p className="text-slate-600 leading-relaxed">{data.summary}</p>
        </div>
      )}

      {/* Experience */}
      {data.experience.length > 0 && (
        <div className="space-y-2.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-250 pb-0.5">Professional Experience</h2>
          {data.experience.map((exp, idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex justify-between font-semibold text-slate-900">
                <span>{exp.title} — {exp.org}</span>
                <span className="font-normal text-slate-500 text-[10px]">{exp.start_date} - {exp.end_date}</span>
              </div>
              <p className="text-[10px] text-slate-500 italic">{exp.location}</p>
              <ul className="list-disc pl-4 space-y-0.5 text-slate-700">
                {exp.bullets.map((b, bIdx) => <li key={bIdx} className="leading-relaxed">{b.text}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* Projects */}
      {data.projects.length > 0 && (
        <div className="space-y-2.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-250 pb-0.5">Academic & Engineering Projects</h2>
          {data.projects.map((proj, idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex justify-between font-semibold text-slate-900">
                <span>{proj.title} ({proj.role})</span>
                <span className="font-normal text-slate-500 text-[10px]">{proj.start_date} - {proj.end_date}</span>
              </div>
              <p className="text-[10px] text-slate-500 font-mono">Tech Stack: {proj.tech_stack.join(", ")}</p>
              <ul className="list-disc pl-4 space-y-0.5 text-slate-700">
                {proj.bullets.map((b, bIdx) => <li key={bIdx} className="leading-relaxed">{b.text}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* Skills */}
      <div className="space-y-1.5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-250 pb-0.5">Technical Skills</h2>
        <div className="grid grid-cols-1 gap-0.5 text-slate-700">
          <div><span className="font-semibold text-slate-900">Core Languages & Tech:</span> {data.skills.technical.join(", ")}</div>
          <div><span className="font-semibold text-slate-900">Tools & Infrastructure:</span> {data.skills.tools.join(", ")}</div>
          <div><span className="font-semibold text-slate-900">Soft Skills:</span> {data.skills.soft.join(", ")}</div>
        </div>
      </div>

      {/* Education */}
      {data.education.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-250 pb-0.5">Education</h2>
          {data.education.map((edu, idx) => (
            <div key={idx} className="space-y-0.5">
              <div className="flex justify-between font-semibold text-slate-900">
                <span>{edu.degree} — {edu.institution}</span>
                <span className="font-normal text-slate-500 text-[10px]">{edu.start_date} - {edu.end_date}</span>
              </div>
              <div className="flex justify-between text-slate-500 text-[10px]">
                <span>{edu.location}</span>
                <span>CGPA/Grade: {edu.cgpa_or_percentage}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Certifications */}
      {data.certifications.length > 0 && (
        <div className="space-y-1.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-250 pb-0.5">Certifications</h2>
          <div className="grid grid-cols-2 gap-2 text-slate-700">
            {data.certifications.map((cert, idx) => (
              <div key={idx} className="flex justify-between text-[10px]">
                <span>{cert.name} ({cert.issuer})</span>
                <span className="text-slate-400 font-mono text-[9px]">{cert.date}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Achievements */}
      {data.achievements.length > 0 && (
        <div className="space-y-1.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-250 pb-0.5">Achievements</h2>
          <ul className="list-disc pl-4 space-y-0.5 text-slate-700">
            {data.achievements.map((ach, idx) => (
              <li key={idx} className="leading-relaxed">{ach.text}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

const renderGrotesk = (data: ResumeData) => {
  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", color: "#0f172a" }} className="space-y-5 text-[11px] leading-relaxed">
      {/* Header */}
      <div className="border-b border-slate-950 pb-3">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{data.contact.name}</h1>
        <div className="flex flex-wrap gap-x-4 text-[9px] text-slate-500 mt-2 font-mono">
          <span>{data.contact.location}</span>
          <span>{data.contact.phone}</span>
          <span>{data.contact.email}</span>
          {data.contact.linkedin_url && <span>LinkedIn: {data.contact.linkedin_url}</span>}
          {data.contact.github_url && <span>GitHub: {data.contact.github_url}</span>}
        </div>
      </div>

      {/* 1. Skills (Placed at the top for skills-forward Tech resume) */}
      <div className="space-y-1.5">
        <h2 className="text-xs font-bold uppercase tracking-wide text-slate-900 border-l-2 border-slate-900 pl-2">Technical Skills</h2>
        <div className="space-y-1 text-slate-700">
          <div><strong>Languages & Tech:</strong> {data.skills.technical.join(", ")}</div>
          <div><strong>Tools & Platforms:</strong> {data.skills.tools.join(", ")}</div>
          <div><strong>Soft Skills:</strong> {data.skills.soft.join(", ")}</div>
        </div>
      </div>

      {/* 2. Experience */}
      {data.experience.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wide text-slate-900 border-l-2 border-slate-900 pl-2">Professional Experience</h2>
          {data.experience.map((exp, idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex justify-between font-bold text-slate-900">
                <span>{exp.title} | {exp.org}</span>
                <span className="font-normal text-slate-500 text-[10px]">{exp.start_date} - {exp.end_date}</span>
              </div>
              <p className="text-[9px] text-slate-400">{exp.location}</p>
              <ul className="list-disc pl-4 space-y-0.5 text-slate-700">
                {exp.bullets.map((b, bIdx) => <li key={bIdx} className="leading-relaxed">{b.text}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* 3. Projects */}
      {data.projects.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wide text-slate-900 border-l-2 border-slate-900 pl-2">Projects</h2>
          {data.projects.map((proj, idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex justify-between font-bold text-slate-900">
                <span>{proj.title} — {proj.role}</span>
                <span className="font-normal text-slate-500 text-[10px]">{proj.start_date} - {proj.end_date}</span>
              </div>
              <p className="text-[9px] text-slate-400">Stack: {proj.tech_stack.join(", ")}</p>
              <ul className="list-disc pl-4 space-y-0.5 text-slate-700">
                {proj.bullets.map((b, bIdx) => <li key={bIdx} className="leading-relaxed">{b.text}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* 4. Education */}
      {data.education.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wide text-slate-900 border-l-2 border-slate-900 pl-2">Education</h2>
          {data.education.map((edu, idx) => (
            <div key={idx} className="space-y-0.5">
              <div className="flex justify-between font-bold text-slate-900">
                <span>{edu.degree} — {edu.institution}</span>
                <span className="font-normal text-slate-500 text-[10px]">{edu.start_date} - {edu.end_date}</span>
              </div>
              <div className="flex justify-between text-slate-500 text-[10px]">
                <span>{edu.location}</span>
                <span>CGPA: {edu.cgpa_or_percentage}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 5. Certifications */}
      {data.certifications.length > 0 && (
        <div className="space-y-1.5">
          <h2 className="text-xs font-bold uppercase tracking-wide text-slate-900 border-l-2 border-slate-900 pl-2">Certifications</h2>
          <div className="grid grid-cols-2 gap-2 text-slate-700">
            {data.certifications.map((cert, idx) => (
              <div key={idx} className="flex justify-between text-[10px]">
                <span>{cert.name} ({cert.issuer})</span>
                <span className="text-slate-400 font-mono text-[9px]">{cert.date}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const renderCampus = (data: ResumeData) => {
  return (
    <div style={{ fontFamily: "Arial, sans-serif", color: "#1e293b" }} className="space-y-5 text-xs leading-normal">
      {/* Header */}
      <div className="text-center border-b-2 border-[#1E3A8A] pb-3">
        <h1 className="text-2xl font-bold text-[#1E3A8A] uppercase tracking-wide">{data.contact.name}</h1>
        <p className="text-[9px] font-mono text-blue-800 tracking-wider mt-0.5 font-semibold">Campus Placement Portfolio</p>
        <div className="flex justify-center gap-x-3 text-[10px] text-blue-800 mt-2 font-mono">
          <span>{data.contact.location}</span>
          <span>{data.contact.phone}</span>
          <span>{data.contact.email}</span>
        </div>
        {(data.contact.linkedin_url || data.contact.github_url) && (
          <div className="flex justify-center gap-x-3 text-[10px] text-blue-800 mt-0.5 font-mono">
            {data.contact.linkedin_url && <span>LinkedIn: {data.contact.linkedin_url}</span>}
            {data.contact.github_url && <span>GitHub: {data.contact.github_url}</span>}
          </div>
        )}
      </div>

      {/* 1. Education (First! Table-like rendering via CSS Grid - No literal HTML <table>) */}
      {data.education.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#1E3A8A] border-b border-[#1E3A8A] pb-0.5">Education</h2>
          {data.education.map((edu, idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex justify-between font-bold text-slate-900">
                <span>{edu.degree} — {edu.institution}</span>
                <span className="font-normal text-slate-500 text-[10px]">{edu.start_date} - {edu.end_date}</span>
              </div>
              <div className="flex justify-between text-slate-505 text-[10px]">
                <span>{edu.location}</span>
                <span>CGPA/Grade: {edu.cgpa_or_percentage}</span>
              </div>
              {/* CSS Grid for X/XII board marks */}
              {edu.board_x && (
                <div className="mt-1.5 p-2 bg-blue-50/50 border border-blue-100 rounded text-[9.5px]">
                  <div className="grid grid-cols-2 gap-x-4">
                    <div><strong className="text-[#1E3A8A]">Class X Board:</strong> {edu.board_x}</div>
                    <div><strong className="text-[#1E3A8A]">Class XII Board:</strong> {edu.board_xii}</div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Declarations Block */}
      <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-[9.5px] text-slate-650 leading-relaxed font-mono">
        <strong className="text-[8.5px] uppercase text-slate-500 block mb-1">Mandatory Placement Declarations</strong>
        <div className="grid grid-cols-2 gap-2">
          <div>Placements Category: <span className="font-bold text-slate-800">Campus Recruit Candidate</span></div>
          <div>Lineage Proof: <span className="font-bold text-slate-800">Grounded evidence trace logged</span></div>
        </div>
      </div>

      {/* 2. Projects */}
      {data.projects.length > 0 && (
        <div className="space-y-2.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#1E3A8A] border-b border-[#1E3A8A] pb-0.5">Academic & Engineering Projects</h2>
          {data.projects.map((proj, idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex justify-between font-bold text-slate-900">
                <span>{proj.title} ({proj.role})</span>
                <span className="font-normal text-slate-500 text-[10px]">{proj.start_date} - {proj.end_date}</span>
              </div>
              <p className="text-[10px] text-slate-500 font-mono">Technologies: {proj.tech_stack.join(", ")}</p>
              <ul className="list-disc pl-4 space-y-0.5 text-slate-700">
                {proj.bullets.map((b, bIdx) => <li key={bIdx} className="leading-relaxed">{b.text}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* 3. Skills */}
      <div className="space-y-1.5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#1E3A8A] border-b border-[#1E3A8A] pb-0.5">Technical Skills</h2>
        <div className="grid grid-cols-1 gap-1 text-slate-750">
          <div><strong>Languages & Tech:</strong> {data.skills.technical.join(", ")}</div>
          <div><strong>Tools & Platforms:</strong> {data.skills.tools.join(", ")}</div>
          <div><strong>Soft Skills:</strong> {data.skills.soft.join(", ")}</div>
        </div>
      </div>

      {/* 4. Achievements */}
      {data.achievements.length > 0 && (
        <div className="space-y-1.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#1E3A8A] border-b border-[#1E3A8A] pb-0.5">Achievements & Ranks</h2>
          <ul className="list-disc pl-4 space-y-0.5 text-slate-700">
            {data.achievements.map((ach, idx) => (
              <li key={idx} className="leading-relaxed">{ach.text}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 5. Experience */}
      {data.experience.length > 0 && (
        <div className="space-y-2.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#1E3A8A] border-b border-[#1E3A8A] pb-0.5">Experience & Internships</h2>
          {data.experience.map((exp, idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex justify-between font-bold text-slate-900">
                <span>{exp.title} at {exp.org}</span>
                <span className="font-normal text-slate-500 text-[10px]">{exp.start_date} - {exp.end_date}</span>
              </div>
              <p className="text-[10px] text-slate-500">{exp.location}</p>
              <ul className="list-disc pl-4 space-y-0.5 text-slate-700">
                {exp.bullets.map((b, bIdx) => <li key={bIdx} className="leading-relaxed">{b.text}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* 6. Certifications */}
      {data.certifications.length > 0 && (
        <div className="space-y-1.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#1E3A8A] border-b border-[#1E3A8A] pb-0.5">Certifications</h2>
          <div className="grid grid-cols-2 gap-2 text-slate-700">
            {data.certifications.map((cert, idx) => (
              <div key={idx} className="flex justify-between text-[10px]">
                <span>{cert.name} ({cert.issuer})</span>
                <span className="text-slate-400 font-mono text-[9px]">{cert.date}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const renderInternship = (data: ResumeData) => {
  return (
    <div style={{ fontFamily: "Helvetica, sans-serif", color: "#1f2937" }} className="space-y-5 text-xs leading-normal">
      {/* Header */}
      <div className="border-b border-[#3730A3] pb-3">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{data.contact.name}</h1>
        <p className="text-[9px] uppercase font-bold text-[#3730A3] mt-0.5">{data.contact.title}</p>
        <div className="flex flex-wrap gap-x-3 text-[9px] text-slate-500 mt-2 font-mono">
          <span>{data.contact.location}</span>
          <span>{data.contact.phone}</span>
          <span>{data.contact.email}</span>
          {data.contact.linkedin_url && <span>LinkedIn: {data.contact.linkedin_url}</span>}
          {data.contact.github_url && <span>GitHub: {data.contact.github_url}</span>}
        </div>
      </div>

      {/* 1. Education (No boards X/XII, no declarations) */}
      {data.education.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#3730A3] border-b border-[#3730A3] pb-0.5">Education</h2>
          {data.education.map((edu, idx) => (
            <div key={idx} className="space-y-0.5">
              <div className="flex justify-between font-bold text-slate-900">
                <span>{edu.degree} — {edu.institution}</span>
                <span className="font-normal text-slate-500 text-[10px]">{edu.start_date} - {edu.end_date}</span>
              </div>
              <div className="flex justify-between text-slate-500 text-[10px]">
                <span>{edu.location}</span>
                <span>GPA/Grade: {edu.cgpa_or_percentage}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 2. Projects */}
      {data.projects.length > 0 && (
        <div className="space-y-2.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#3730A3] border-b border-[#3730A3] pb-0.5">Projects Showcase</h2>
          {data.projects.map((proj, idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex justify-between font-bold text-slate-900">
                <span>{proj.title} | {proj.role}</span>
                <span className="font-normal text-slate-500 text-[10px]">{proj.start_date} - {proj.end_date}</span>
              </div>
              <p className="text-[10px] text-slate-500">Tech Stack: {proj.tech_stack.join(", ")}</p>
              <ul className="list-disc pl-4 space-y-0.5 text-slate-700">
                {proj.bullets.map((b, bIdx) => <li key={bIdx} className="leading-relaxed">{b.text}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* 3. Experience */}
      {data.experience.length > 0 && (
        <div className="space-y-2.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#3730A3] border-b border-[#3730A3] pb-0.5">Professional Experience</h2>
          {data.experience.map((exp, idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex justify-between font-bold text-slate-900">
                <span>{exp.title} — {exp.org}</span>
                <span className="font-normal text-slate-500 text-[10px]">{exp.start_date} - {exp.end_date}</span>
              </div>
              <p className="text-[10px] text-slate-500">{exp.location}</p>
              <ul className="list-disc pl-4 space-y-0.5 text-slate-700">
                {exp.bullets.map((b, bIdx) => <li key={bIdx} className="leading-relaxed">{b.text}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* 4. Skills */}
      <div className="space-y-1.5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#3730A3] border-b border-[#3730A3] pb-0.5">Technical & Tools Skills</h2>
        <div className="grid grid-cols-1 gap-0.5 text-slate-700">
          <div><strong>Technologies:</strong> {data.skills.technical.join(", ")}</div>
          <div><strong>Developer Tools:</strong> {data.skills.tools.join(", ")}</div>
          <div><strong>Soft Skills:</strong> {data.skills.soft.join(", ")}</div>
        </div>
      </div>

      {/* 5. Achievements */}
      {data.achievements.length > 0 && (
        <div className="space-y-1.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#3730A3] border-b border-[#3730A3] pb-0.5">Honors & Achievements</h2>
          <ul className="list-disc pl-4 space-y-0.5 text-slate-700">
            {data.achievements.map((ach, idx) => (
              <li key={idx} className="leading-relaxed">{ach.text}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 6. Certifications */}
      {data.certifications.length > 0 && (
        <div className="space-y-1.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#3730A3] border-b border-[#3730A3] pb-0.5">Certifications</h2>
          <div className="grid grid-cols-2 gap-2 text-slate-700">
            {data.certifications.map((cert, idx) => (
              <div key={idx} className="flex justify-between text-[10px]">
                <span>{cert.name} ({cert.issuer})</span>
                <span className="text-slate-400 font-mono text-[9px]">{cert.date}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const renderCompact = (data: ResumeData) => {
  return (
    <div style={{ fontFamily: "Arial, sans-serif", color: "#334155" }} className="space-y-3.5 text-[10px] leading-snug">
      {/* Header */}
      <div className="flex justify-between items-start border-b-2 border-slate-900 pb-2">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">{data.contact.name}</h1>
          <p className="text-[8.5px] uppercase font-bold text-slate-500 tracking-wide mt-0.5">{data.contact.title}</p>
        </div>
        <div className="text-right text-[8.5px] text-slate-500 font-mono leading-normal">
          <div>{data.contact.location} | {data.contact.phone}</div>
          <div>{data.contact.email}</div>
          <div>{data.contact.linkedin_url} | {data.contact.github_url}</div>
        </div>
      </div>

      {/* 1. Summary */}
      {data.summary && (
        <div>
          <h2 className="text-[10px] font-bold uppercase tracking-tight text-slate-950 bg-slate-100 px-1 py-0.5 mb-1">Executive Summary</h2>
          <p className="text-slate-700 leading-snug">{data.summary}</p>
        </div>
      )}

      {/* 2. Experience */}
      {data.experience.length > 0 && (
        <div>
          <h2 className="text-[10px] font-bold uppercase tracking-tight text-slate-950 bg-slate-100 px-1 py-0.5 mb-1">Professional Experience</h2>
          <div className="space-y-2">
            {data.experience.map((exp, idx) => (
              <div key={idx} className="space-y-0.5">
                <div className="flex justify-between font-bold text-slate-900">
                  <span>{exp.title} at {exp.org}</span>
                  <span className="font-normal text-slate-500 text-[8px]">{exp.start_date} - {exp.end_date}</span>
                </div>
                <ul className="list-disc pl-3 text-slate-700 space-y-0.5">
                  {exp.bullets.map((b, bIdx) => <li key={bIdx}>{b.text}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Skills */}
      <div>
        <h2 className="text-[10px] font-bold uppercase tracking-tight text-slate-950 bg-slate-100 px-1 py-0.5 mb-1">Technical Skills</h2>
        <div className="grid grid-cols-2 gap-x-4 text-slate-700">
          <div><strong>Languages & Tech:</strong> {data.skills.technical.join(", ")}</div>
          <div><strong>Infrastructure:</strong> {data.skills.tools.join(", ")}</div>
        </div>
      </div>

      {/* 4. Projects */}
      {data.projects.length > 0 && (
        <div>
          <h2 className="text-[10px] font-bold uppercase tracking-tight text-slate-950 bg-slate-100 px-1 py-0.5 mb-1">Key Projects</h2>
          <div className="space-y-2">
            {data.projects.map((proj, idx) => (
              <div key={idx} className="space-y-0.5">
                <div className="flex justify-between font-bold text-slate-900">
                  <span>{proj.title} ({proj.role})</span>
                  <span className="font-normal text-slate-500 text-[8px]">{proj.start_date} - {proj.end_date}</span>
                </div>
                <ul className="list-disc pl-3 text-slate-700 space-y-0.5">
                  {proj.bullets.map((b, bIdx) => <li key={bIdx}>{b.text}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Education */}
      {data.education.length > 0 && (
        <div>
          <h2 className="text-[10px] font-bold uppercase tracking-tight text-slate-950 bg-slate-100 px-1 py-0.5 mb-1">Education</h2>
          {data.education.map((edu, idx) => (
            <div key={idx} className="flex justify-between font-bold text-slate-900 text-[9.5px]">
              <span>{edu.degree} — {edu.institution} ({edu.cgpa_or_percentage})</span>
              <span className="font-normal text-slate-500">{edu.start_date} - {edu.end_date}</span>
            </div>
          ))}
        </div>
      )}

      {/* 6. Certifications */}
      {data.certifications.length > 0 && (
        <div>
          <h2 className="text-[10px] font-bold uppercase tracking-tight text-slate-950 bg-slate-100 px-1 py-0.5 mb-1">Certifications</h2>
          <div className="grid grid-cols-2 gap-1 text-[8.5px] text-slate-700">
            {data.certifications.map((cert, idx) => (
              <div key={idx} className="truncate">
                {cert.name} ({cert.issuer})
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const renderAcademic = (data: ResumeData) => {
  // Filter publications separately for academic CV
  const publications = data.achievements.filter(ach => 
    /publish|paper|journal|thesis|conference|ieee|acm|patent/i.test(ach.text)
  );
  const otherAchievements = data.achievements.filter(ach => 
    !/publish|paper|journal|thesis|conference|ieee|acm|patent/i.test(ach.text)
  );

  return (
    <div style={{ fontFamily: "'Times New Roman', Times, serif", color: "#111827" }} className="space-y-6 text-[11.5px] leading-relaxed">
      {/* Header */}
      <div className="text-center border-b-2 border-gray-950 pb-4">
        <h1 className="text-3xl font-bold tracking-wide text-black uppercase">{data.contact.name}</h1>
        <p className="text-[10px] italic text-gray-500 font-serif mt-1">{data.contact.title}</p>
        <div className="flex justify-center gap-x-3 text-[10px] text-gray-655 mt-2 font-mono">
          <span>{data.contact.location}</span><span>|</span>
          <span>{data.contact.phone}</span><span>|</span>
          <span>{data.contact.email}</span>
        </div>
        <div className="flex justify-center gap-x-3 text-[10px] text-gray-655 font-mono mt-0.5">
          <span>{data.contact.linkedin_url}</span><span>|</span>
          <span>{data.contact.github_url}</span>
        </div>
      </div>

      {/* 1. Research Summary */}
      {data.summary && (
        <div className="space-y-1.5">
          <h2 className="text-sm font-bold italic text-gray-950 border-b border-gray-900 pb-0.5">Research & Statement</h2>
          <p className="text-gray-700 leading-relaxed">{data.summary}</p>
        </div>
      )}

      {/* 2. Education */}
      {data.education.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-bold italic text-gray-950 border-b border-gray-900 pb-0.5">Education</h2>
          {data.education.map((edu, idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex justify-between font-bold text-black">
                <span>{edu.degree} — {edu.institution}</span>
                <span className="font-normal text-gray-500 text-[10px]">{edu.start_date} - {edu.end_date}</span>
              </div>
              <div className="flex justify-between text-gray-600 text-[10px]">
                <span>{edu.location}</span>
                <span>GPA: {edu.cgpa_or_percentage}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. Publications (Genuinely distinct section positioned after Education) */}
      {publications.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-bold italic text-gray-950 border-b border-gray-900 pb-0.5">Publications & Scholarly Papers</h2>
          <ul className="list-disc pl-4 space-y-1 text-gray-800">
            {publications.map((pub, idx) => (
              <li key={idx} className="leading-relaxed">{pub.text}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 4. Experience (assistantships) */}
      {data.experience.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-bold italic text-gray-950 border-b border-gray-900 pb-0.5">Academic & Teaching Experience</h2>
          {data.experience.map((exp, idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex justify-between font-bold text-black">
                <span>{exp.title} — {exp.org}</span>
                <span className="font-normal text-gray-500 text-[10px]">{exp.start_date} - {exp.end_date}</span>
              </div>
              <p className="text-[10px] text-gray-500 italic">{exp.location}</p>
              <ul className="list-disc pl-4 space-y-0.5 text-gray-700">
                {exp.bullets.map((b, bIdx) => <li key={bIdx} className="leading-relaxed">{b.text}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* 5. Certifications & Academic Honors */}
      {data.certifications.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-bold italic text-gray-950 border-b border-gray-900 pb-0.5">Certifications & Honors</h2>
          <div className="grid grid-cols-1 gap-2 text-gray-800">
            {data.certifications.map((cert, idx) => (
              <div key={idx} className="flex justify-between">
                <span>{cert.name} ({cert.issuer})</span>
                <span className="text-gray-550 font-mono text-[10px]">{cert.date}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Projects */}
      {data.projects.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-bold italic text-gray-950 border-b border-gray-900 pb-0.5">Research Projects</h2>
          {data.projects.map((proj, idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex justify-between font-bold text-black">
                <span>{proj.title} ({proj.role})</span>
                <span className="font-normal text-gray-500 text-[10px]">{proj.start_date} - {proj.end_date}</span>
              </div>
              <ul className="list-disc pl-4 space-y-0.5 text-gray-700">
                {proj.bullets.map((b, bIdx) => <li key={bIdx} className="leading-relaxed">{b.text}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* 7. Achievements (Non-publication) */}
      {otherAchievements.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-bold italic text-gray-950 border-b border-gray-900 pb-0.5">Additional Achievements</h2>
          <ul className="list-disc pl-4 space-y-0.5 text-gray-800">
            {otherAchievements.map((ach, idx) => (
              <li key={idx} className="leading-relaxed">{ach.text}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

const renderMinimal = (data: ResumeData) => {
  return (
    <div style={{ fontFamily: "Georgia, serif", color: "#334155" }} className="space-y-6 text-xs leading-relaxed">
      {/* Header with Rust Accent */}
      <div className="border-l-4 border-[#8A5A34] pl-4 py-1">
        <h1 className="text-2xl font-light uppercase tracking-widest text-[#8A5A34]">{data.contact.name}</h1>
        <p className="text-[9px] tracking-wide text-slate-500 uppercase font-medium">{data.contact.title}</p>
        <div className="flex flex-wrap gap-x-3 text-[9px] text-slate-400 mt-2 font-mono">
          <span>{data.contact.location}</span>
          <span>•</span>
          <span>{data.contact.phone}</span>
          <span>•</span>
          <span>{data.contact.email}</span>
        </div>
      </div>

      {/* 1. Technical Skills */}
      <div className="space-y-1.5">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[#8A5A34] flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-[#8A5A34] rounded-full"></span>
          Technical Stack
        </h2>
        <div className="grid grid-cols-1 gap-1 text-[11px] text-slate-600 pl-3">
          <div><strong className="text-slate-800">Core Stack:</strong> {data.skills.technical.join(", ")}</div>
          <div><strong className="text-slate-800">Tools & Platforms:</strong> {data.skills.tools.join(", ")}</div>
        </div>
      </div>

      {/* 2. Experience */}
      {data.experience.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[#8A5A34] flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-[#8A5A34] rounded-full"></span>
            Professional Experience
          </h2>
          {data.experience.map((exp, idx) => (
            <div key={idx} className="space-y-1 pl-3 border-l border-slate-100">
              <div className="flex justify-between font-bold text-slate-900">
                <span>{exp.title} — {exp.org}</span>
                <span className="font-normal text-slate-450 text-[10px]">{exp.start_date} - {exp.end_date}</span>
              </div>
              <ul className="list-disc pl-3 space-y-0.5 text-slate-600">
                {exp.bullets.map((b, bIdx) => <li key={bIdx} className="leading-relaxed">{b.text}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* 3. Projects */}
      {data.projects.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[#8A5A34] flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-[#8A5A34] rounded-full"></span>
            Projects History
          </h2>
          {data.projects.map((proj, idx) => (
            <div key={idx} className="space-y-1 pl-3 border-l border-slate-100">
              <div className="flex justify-between font-bold text-slate-900">
                <span>{proj.title} ({proj.role})</span>
                <span className="font-normal text-slate-455 text-[10px]">{proj.start_date} - {proj.end_date}</span>
              </div>
              <ul className="list-disc pl-3 space-y-0.5 text-slate-600">
                {proj.bullets.map((b, bIdx) => <li key={bIdx} className="leading-relaxed">{b.text}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* 4. Education */}
      {data.education.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[#8A5A34] flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-[#8A5A34] rounded-full"></span>
            Education
          </h2>
          {data.education.map((edu, idx) => (
            <div key={idx} className="space-y-0.5 pl-3">
              <div className="flex justify-between font-bold text-slate-800">
                <span>{edu.degree}</span>
                <span className="font-normal text-slate-455 text-[10px]">{edu.start_date} - {edu.end_date}</span>
              </div>
              <div className="text-slate-500 text-[10px]">
                {edu.institution} | GPA: {edu.cgpa_or_percentage}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 5. Certifications */}
      {data.certifications.length > 0 && (
        <div className="space-y-1.5">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[#8A5A34] flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-[#8A5A34] rounded-full"></span>
            Certifications
          </h2>
          <div className="grid grid-cols-2 gap-2 text-slate-600 pl-3">
            {data.certifications.map((cert, idx) => (
              <div key={idx} className="text-[10px]">
                {cert.name} ({cert.issuer})
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const renderPSU = (data: ResumeData) => {
  return (
    <div style={{ fontFamily: "Arial, sans-serif", color: "#000" }} className="space-y-4 text-xs leading-normal">
      {/* Boxed Header Grid */}
      <div className="border border-black p-4 flex justify-between items-start">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold uppercase tracking-wider text-black">{data.contact.name}</h1>
          <p className="text-[10px] uppercase font-bold text-gray-700 tracking-wider">Candidate Application Record</p>
          <div className="space-y-0.5 text-[10px] text-gray-900 font-mono">
            <div>Email: {data.contact.email}</div>
            <div>Mobile: {data.contact.phone}</div>
            <div>Location: {data.contact.location}</div>
          </div>
        </div>
        {/* Passport Photo Affix Box */}
        <div className="w-24 h-28 border border-black bg-gray-100 flex flex-col items-center justify-center p-2 text-center text-[7px] font-mono text-gray-500 uppercase tracking-tighter shrink-0 ml-4 font-bold">
          <span>AFFIX</span>
          <span>PASSPORT</span>
          <span>PHOTO HERE</span>
        </div>
      </div>

      {/* Opt-in Personal Details Block */}
      <div className="border border-black p-3 bg-gray-50 text-[10px]">
        <strong className="text-[9px] uppercase block mb-1 text-gray-750 tracking-wider border-b border-gray-200 pb-0.5">Personal Identity Declarations</strong>
        <div className="grid grid-cols-2 gap-y-1 leading-relaxed font-mono">
          <div><span className="font-semibold text-black">Date of Birth:</span> {data.segment_fields?.dob || "12-10-1999"}</div>
          <div><span className="font-semibold text-black">Category/Quota:</span> {data.segment_fields?.category || "General"}</div>
          <div><span className="font-semibold text-black">Verification Audit:</span> Groundwork Provenance Verified</div>
          <div><span className="font-semibold text-black">Fresume Trace ID:</span> {data.meta?.version_number ? `v${data.meta.version_number}-trace` : "v1-active"}</div>
        </div>
      </div>

      {/* 1. Education (First! Including detailed boards via CSS Grid - No literal HTML table) */}
      {data.education.length > 0 && (
        <div className="border border-black p-3 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wide bg-gray-200 border-b border-black py-1 px-2 text-center">Academic Records</h2>
          {data.education.map((edu, idx) => (
            <div key={idx} className="space-y-1.5 border-b border-dashed border-gray-200 pb-2 last:border-b-0 last:pb-0">
              <div className="flex justify-between font-bold">
                <span>{edu.degree} — {edu.institution}</span>
                <span className="font-normal text-gray-600 text-[10px]">{edu.start_date} - {edu.end_date}</span>
              </div>
              <div className="flex justify-between text-gray-700 text-[10px]">
                <span>{edu.location}</span>
                <span>CGPA / Grade: {edu.cgpa_or_percentage}</span>
              </div>
              
              {/* CSS Grid for X/XII board records */}
              <div className="bg-gray-150 p-2 border border-gray-200 text-[9px] leading-relaxed">
                <div className="grid grid-cols-2 gap-x-4">
                  <div><span className="font-semibold text-gray-800 font-sans">10th Class Board:</span> {edu.board_x || "N/A"}</div>
                  <div><span className="font-semibold text-gray-800 font-sans">12th Class Board:</span> {edu.board_xii || "N/A"}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 2. Experience */}
      {data.experience.length > 0 && (
        <div className="border border-black p-3 space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wide bg-gray-200 border-b border-black py-1 px-2 text-center">Employment & Corporate History</h2>
          {data.experience.map((exp, idx) => (
            <div key={idx} className="space-y-1.5">
              <div className="flex justify-between font-bold">
                <span>{exp.title} at {exp.org}</span>
                <span className="font-normal text-gray-600 text-[10px]">{exp.start_date} - {exp.end_date}</span>
              </div>
              <p className="text-[9px] text-gray-650 italic">{exp.location}</p>
              <ul className="list-disc pl-4 space-y-0.5 text-gray-800">
                {exp.bullets.map((b, bIdx) => <li key={bIdx}>{b.text}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* 3. Certifications */}
      {data.certifications.length > 0 && (
        <div className="border border-black p-3 space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wide bg-gray-200 border-b border-black py-1 px-2 text-center">Formal Certifications</h2>
          <div className="grid grid-cols-2 gap-2 text-gray-800">
            {data.certifications.map((cert, idx) => (
              <div key={idx} className="flex justify-between text-[10px]">
                <span>{cert.name} ({cert.issuer})</span>
                <span className="text-gray-555 font-mono text-[9px]">{cert.date}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Skills */}
      <div className="border border-black p-3 space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wide bg-gray-200 border-b border-black py-1 px-2 text-center">Skills Grid</h2>
        <div className="grid grid-cols-1 gap-1 text-gray-800 font-sans">
          <div><span className="font-semibold text-black">Core Technologies:</span> {data.skills.technical.join(", ")}</div>
          <div><span className="font-semibold text-black">Tools & Infrastructure:</span> {data.skills.tools.join(", ")}</div>
        </div>
      </div>

      {/* 5. Projects */}
      {data.projects.length > 0 && (
        <div className="border border-black p-3 space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wide bg-gray-200 border-b border-black py-1 px-2 text-center">Technical & Academic Projects</h2>
          {data.projects.map((proj, idx) => (
            <div key={idx} className="space-y-1.5">
              <div className="flex justify-between font-bold">
                <span>{proj.title} ({proj.role})</span>
                <span className="font-normal text-gray-650 text-[10px]">{proj.start_date} - {proj.end_date}</span>
              </div>
              <p className="text-[10px] text-gray-605">Tech Stack: {proj.tech_stack.join(", ")}</p>
              <ul className="list-disc pl-4 space-y-0.5 text-gray-800">
                {proj.bullets.map((b, bIdx) => <li key={bIdx}>{b.text}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

