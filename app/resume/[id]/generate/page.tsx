"use client";

import React, { useState, useEffect } from "react";
import { Database } from "../../../../lib/supabase";
import { Resume, Bullet, Education, Experience, Project, Certification, ExportRecord } from "../../../../lib/schema";
import { auditChainOfCustody, AuditResult } from "../../../../lib/gemini";
import { 
  ArrowLeft, Download, Eye, FileText, Check, AlertTriangle, Play, CheckCircle2, ShieldCheck, RefreshCw, Sparkles, Languages, Printer
} from "lucide-react";
import Link from "next/link";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function GeneratePage({ params }: PageProps) {
  const { id } = React.use(params);
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
          alert(errorData.error || "Monthly free export limit exceeded (3 / month). Please upgrade to the Pro Ledger Plan for unlimited exports.");
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
        a.download = `${name.replace(/\s+/g, "_")}_Groundwork_Export.doc`;
        a.click();
        logExport("docx");
      } else {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 403 || errorData.limitExceeded) {
          alert(errorData.error || "Monthly free export limit exceeded (3 / month). Please upgrade to the Pro Ledger Plan for unlimited exports.");
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
  const isAcademic = selectedTemplate === "academic";
  const isMinimal = selectedTemplate === "minimal";
  const isGrotesk = selectedTemplate === "grotesk";
  const isCampus = selectedTemplate === "campus";
  const isInternship = selectedTemplate === "internship";
  const isPSU = selectedTemplate === "fresher-psu";

  const getContainerFontClass = () => {
    if (isAcademic) return "font-serif text-[11.5px] leading-relaxed text-slate-900";
    if (isCompact) return "font-sans text-[10.5px] leading-normal text-slate-800";
    if (isGrotesk) return "font-sans text-xs leading-relaxed text-slate-900";
    return "font-sans text-xs leading-relaxed text-gray-800";
  };

  const renderSectionHeader = (title: string) => {
    switch (selectedTemplate) {
      case "grotesk":
        return (
          <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-slate-800 border-b border-slate-800 pb-1 mt-4 mb-2">
            // {title}
          </h2>
        );
      case "academic":
        return (
          <h2 className="font-serif text-sm font-bold italic tracking-wide text-gray-900 border-b border-gray-950 pb-0.5 mt-5 mb-2.5">
            {title}
          </h2>
        );
      case "compact":
        return (
          <h2 className="text-[11px] font-sans font-extrabold uppercase tracking-tight text-slate-950 bg-slate-100 px-1.5 py-0.5 mt-3 mb-1.5">
            {title}
          </h2>
        );
      case "minimal":
        return (
          <h2 className="text-xs font-sans font-semibold uppercase tracking-widest text-[#8A5A34] flex items-center gap-2 mt-4 mb-2">
            <span className="w-1.5 h-1.5 bg-[#8A5A34] rounded-full">•</span>
            {title}
          </h2>
        );
      case "campus":
        return (
          <h2 className="text-xs font-sans font-bold uppercase tracking-wider text-blue-900 border-b border-blue-900 pb-0.5 mt-4 mb-2">
            {title}
          </h2>
        );
      case "fresher-psu":
        return (
          <h2 className="text-xs font-sans font-bold uppercase tracking-wide text-black bg-gray-200 border border-gray-400 py-1 px-2 mt-4 mb-2 text-center">
            {title}
          </h2>
        );
      case "internship":
        return (
          <h2 className="text-xs font-sans font-bold uppercase tracking-wider text-indigo-900 border-b border-indigo-200 pb-0.5 mt-4 mb-2">
            {title}
          </h2>
        );
      default: // classic
        return (
          <h2 className="text-xs font-sans font-bold uppercase tracking-wider text-slate-800 border-b border-gray-300 pb-1 mt-4 mb-2">
            {title}
          </h2>
        );
    }
  };

  const renderEducationSection = () => {
    if (data.education.length === 0) return null;
    return (
      <div className={`${isCompact ? "space-y-1" : "space-y-2"}`}>
        {renderSectionHeader("Education")}
        {data.education.map((edu, idx) => (
          <div key={idx} className={`${isCompact ? "text-[10px]" : "text-xs"} space-y-0.5`}>
            <div className="flex justify-between font-semibold">
              <span>{edu.degree} — {edu.institution}</span>
              <span className="font-normal text-gray-500">{edu.start_date} - {edu.end_date}</span>
            </div>
            <div className="flex justify-between text-gray-600 text-[11px]">
              <span>Location: {edu.location}</span>
              <span>Grade/CGPA: {edu.cgpa_or_percentage}</span>
            </div>
            {edu.board_x && !isInternship && (
              <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                Secondary Board (Class X): {edu.board_x} | Higher Secondary (Class XII): {edu.board_xii}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderExperienceSection = () => {
    if (data.experience.length === 0) return null;
    return (
      <div className={`${isCompact ? "space-y-2" : "space-y-3"}`}>
        {renderSectionHeader("Professional Experience")}
        {data.experience.map((exp, idx) => (
          <div key={idx} className={`${isCompact ? "space-y-0.5 text-[10px]" : "space-y-1 text-xs"}`}>
            <div className="flex justify-between font-semibold">
              <span>{exp.title} at {exp.org}</span>
              <span className="font-normal text-gray-500">{exp.start_date} - {exp.end_date}</span>
            </div>
            <p className="text-gray-500 italic text-[11px]">{exp.location}</p>
            <ul className="list-disc pl-4 space-y-0.5 text-gray-700">
              {exp.bullets.map((b, bIdx) => (
                <li key={bIdx} className="leading-relaxed">{b.text}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    );
  };

  const renderProjectsSection = () => {
    if (data.projects.length === 0) return null;
    return (
      <div className={`${isCompact ? "space-y-2" : "space-y-3"}`}>
        {renderSectionHeader("Academic & Engineering Projects")}
        {data.projects.map((proj, idx) => (
          <div key={idx} className={`${isCompact ? "space-y-0.5 text-[10px]" : "space-y-1 text-xs"}`}>
            <div className="flex justify-between font-semibold">
              <span>{proj.title} ({proj.role})</span>
              <span className="font-normal text-gray-500">{proj.start_date} - {proj.end_date}</span>
            </div>
            <p className="text-gray-500 text-[11px] font-mono">Technologies: {proj.tech_stack.join(", ")}</p>
            <ul className="list-disc pl-4 space-y-0.5 text-gray-700">
              {proj.bullets.map((b, bIdx) => (
                <li key={bIdx} className="leading-relaxed">{b.text}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    );
  };

  const renderSkillsSection = () => {
    return (
      <div className={`${isCompact ? "space-y-1" : "space-y-2"}`}>
        {renderSectionHeader("Technical Skills")}
        <div className={`${isCompact ? "text-[10px]" : "text-xs"} space-y-1`}>
          <div><span className="font-semibold">Core Languages & Frameworks:</span> {data.skills.technical.join(", ")}</div>
          <div><span className="font-semibold">Tools & Infrastructure:</span> {data.skills.tools.join(", ")}</div>
          <div><span className="font-semibold">Soft Skills:</span> {data.skills.soft.join(", ")}</div>
        </div>
      </div>
    );
  };

  const renderCertificationsSection = () => {
    if (data.certifications.length === 0) return null;
    return (
      <div className="space-y-2">
        {renderSectionHeader("Certifications")}
        <div className={`${isCompact ? "text-[10px]" : "text-xs"} grid grid-cols-1 md:grid-cols-2 gap-2`}>
          {data.certifications.map((cert, idx) => (
            <div key={idx} className="flex justify-between">
              <span>{cert.name} ({cert.issuer})</span>
              <span className="text-gray-500 font-mono text-[10px]">{cert.date}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderAchievementsSection = () => {
    if (data.achievements.length === 0) return null;
    return (
      <div className="space-y-2">
        {renderSectionHeader("Academic & Extra-Curricular Achievements")}
        <ul className="list-disc pl-4 space-y-0.5 text-gray-700 text-xs">
          {data.achievements.map((ach, idx) => (
            <li key={idx} className={`${isCompact ? "text-[10px]" : "text-xs"}`}>{ach.text}</li>
          ))}
        </ul>
      </div>
    );
  };

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
          <div className={`bg-white border border-line rounded-lg shadow-md p-10 min-h-[1100px] text-[#1a1a1a] print:p-0 print:border-none print:shadow-none text-left ${getContainerFontClass()}`}>
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
            
            <div id="printable-area" className={`w-full ${isCompact ? "space-y-4" : "space-y-6"}`}>
              {/* Header block adapted to template */}
              <div className={`flex items-start pb-4 border-b ${
                isCompact ? "justify-between border-b-2 border-slate-900" :
                isPSU ? "justify-between border-b border-gray-400" : "flex-col text-center space-y-1"
              }`}>
                <div className={`${isGrotesk ? "text-left" : "w-full text-center"}`}>
                  <h1 className={`font-semibold tracking-tight ${
                    isGrotesk ? "font-display text-3xl uppercase tracking-widest text-slate-950 font-bold" :
                    isAcademic ? "font-serif text-3xl text-black font-semibold" :
                    isCompact ? "text-xl text-slate-900 font-bold" :
                    isMinimal ? "text-2xl font-light tracking-wide text-[#8A5A34] uppercase" :
                    "text-3xl text-gray-900 font-bold"
                  }`}>
                    {data.contact.name || "Aman Sharma"}
                  </h1>
                  
                  <div className={`text-xs text-gray-600 flex gap-3 flex-wrap ${
                    isGrotesk ? "justify-start mt-2" : "justify-center"
                  } font-mono`}>
                    <span>{data.contact.email || "aman@example.com"}</span>
                    <span>|</span>
                    <span>{data.contact.phone || "9876543210"}</span>
                    <span>|</span>
                    <span>{data.contact.location || "Bengaluru, India"}</span>
                  </div>

                  {(data.contact.linkedin_url || data.contact.github_url) && (
                    <div className={`text-[11px] text-gray-500 flex gap-3 font-mono mt-1 ${
                      isGrotesk ? "justify-start" : "justify-center"
                    }`}>
                      {data.contact.linkedin_url && <span>LinkedIn: {data.contact.linkedin_url}</span>}
                      {data.contact.github_url && <span>GitHub: {data.contact.github_url}</span>}
                    </div>
                  )}
                </div>

                {isPSU && (
                  <div className="w-24 h-28 border-2 border-dashed border-gray-400 flex flex-col items-center justify-center p-2 text-center text-[7px] font-mono text-gray-400 bg-gray-50 uppercase tracking-tighter shrink-0 ml-4">
                    <span>Affix</span>
                    <span>Passport</span>
                    <span>Photo</span>
                    <span>Here</span>
                  </div>
                )}
              </div>

              {/* Summary */}
              {data.summary && (
                <div className={`${isCompact ? "space-y-0.5" : "space-y-1.5"}`}>
                  {renderSectionHeader("Professional Summary")}
                  <p className={`${isCompact ? "text-[10px]" : "text-xs"} leading-relaxed text-gray-700`}>{data.summary}</p>
                </div>
              )}

              {/* Conditionally rendered Campus declarations */}
              {(isCampus || isPSU) && (
                <div className="space-y-1 bg-gray-50 p-2.5 border border-gray-200 rounded font-mono text-[10px] text-gray-700">
                  <span className="font-bold uppercase text-[9px] text-gray-500 block mb-1">Mandatory Declarations (India Placement)</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>Education Segment: <span className="font-bold">{isCampus ? "Campus Recruit" : "Formal Government Application"}</span></div>
                    <div>Provenance Verification Audit: <span className="font-bold">Verified on Groundwork ledger</span></div>
                  </div>
                </div>
              )}

              {/* Layout ordering adapted to Student vs Professional */}
              {isCampus || isInternship ? (
                // Student Template: Education & Projects first
                <>
                  {renderEducationSection()}
                  {renderProjectsSection()}
                  {renderSkillsSection()}
                  {renderExperienceSection()}
                  {renderCertificationsSection()}
                  {renderAchievementsSection()}
                </>
              ) : (
                // Professional Template: Experience first
                <>
                  {renderExperienceSection()}
                  {renderProjectsSection()}
                  {renderSkillsSection()}
                  {renderEducationSection()}
                  {renderCertificationsSection()}
                  {renderAchievementsSection()}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
