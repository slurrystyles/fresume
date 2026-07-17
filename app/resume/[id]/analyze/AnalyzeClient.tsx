"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect } from "react";
import { Database } from "../../../../lib/supabase";
import { Resume, ScoreSnapshot, JDRecord } from "../../../../lib/schema";
import { 
  ArrowLeft, ArrowRight, RefreshCw, AlertTriangle, CheckCircle2, 
  TrendingUp, Layers, Award, Clock, FileText, ChevronRight, Save
} from "lucide-react";
import Link from "next/link";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function AnalyzePage({ params }: PageProps) {
  const resolvedParams = params && (typeof (params as any).then === "function" || params instanceof Promise)
    ? React.use(params)
    : (params as any);
  const id = resolvedParams?.id || "";
  const [resume, setResume] = useState<Resume | null>(null);
  const [scoring, setScoring] = useState<ScoreSnapshot | null>(null);
  const [jdText, setJdText] = useState("");
  const [loading, setLoading] = useState(false);

  const [jdsList, setJdsList] = useState<JDRecord[]>([]);
  const [jdTitle, setJdTitle] = useState("");
  const [jdCompany, setJdCompany] = useState("");
  const [savingJd, setSavingJd] = useState(false);

  useEffect(() => {
    Database.getResumeById(id).then(data => {
      if (data) {
        setResume(data);
        if (data.score_snapshot) {
          setScoring(data.score_snapshot);
        }
        if (data.resume_data.meta?.applied_jd_text) {
          setJdText(data.resume_data.meta.applied_jd_text);
        }
      }
    }).catch(err => {
      console.error(err);
      window.location.href = "/";
    });
    Database.getJDs().then(list => setJdsList(list)).catch(() => {});
  }, [id]);

  const handleSaveJD = async () => {
    if (!jdText.trim()) return;
    setSavingJd(true);
    try {
      await Database.saveJD({
        title: jdTitle.trim() || `Tailoring JD - ${new Date().toLocaleDateString()}`,
        text: jdText,
        company: jdCompany.trim() || undefined
      });
      const list = await Database.getJDs();
      setJdsList(list);
      setJdTitle("");
      setJdCompany("");
      alert("Job Description saved to library!");
    } catch (err) {
      console.error(err);
    } finally {
      setSavingJd(false);
    }
  };

  const handleAnalyze = async (currentResume: Resume) => {
    setLoading(true);
    try {
      const response = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeData: currentResume.resume_data, jdText }),
      });
      const data = await response.json();
      if (data.success && data.scoring) {
        // Merge findings statuses so dismissed findings survive rescore!
        const oldFindings = currentResume.score_snapshot?.findings || [];
        const newFindings = data.scoring.findings.map((newF: any) => {
          const matchingOld = oldFindings.find((oldF: any) => 
            oldF.id === newF.id || 
            (oldF.target_field_path === newF.target_field_path && oldF.category === newF.category)
          );
          if (matchingOld) {
            return { ...newF, status: matchingOld.status };
          }
          return newF;
        });
        const mergedScoring = { ...data.scoring, findings: newFindings };

        setScoring(mergedScoring);

        // Update resume metadata with applied jd
        const updatedResumeData = {
          ...currentResume.resume_data,
          meta: {
            ...currentResume.resume_data.meta,
            applied_jd_text: jdText,
            last_scored_at: new Date().toISOString()
          }
        };

        const updated = { 
          ...currentResume, 
          resume_data: updatedResumeData,
          score_snapshot: mergedScoring 
        };
        setResume(updated);
        await Database.saveResume(updated, true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!resume) {
    return <div className="p-8 text-center font-mono">Loading analysis ledger...</div>;
  }

  const score = scoring?.overallScore || 0;

  return (
    <div className="max-w-5xl mx-auto w-full px-6 py-8 flex-1 flex flex-col justify-start">
      {/* Navigation Header */}
      <div className="flex justify-between items-center mb-8 border-b border-line pb-4">
        <Link href="/" className="text-xs font-mono text-ink/60 hover:text-ink flex items-center gap-1">
          <ArrowLeft size={12} />
          <span>Back to Dashboard</span>
        </Link>
        <div className="flex gap-4">
          <Link href={`/resume/${id}/fix`} className="px-3 py-1 border border-line rounded text-xs font-mono bg-surface text-ink hover:bg-paper transition">
            Fix Ledger
          </Link>
          <Link href={`/resume/${id}/generate`} className="px-3 py-1 border border-line rounded text-xs font-mono bg-surface text-ink hover:bg-paper transition">
            Generate Resume
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left: Score Overview & JD Match Area */}
        <div className="space-y-6">
          <div className="bg-surface border border-line p-6 rounded-lg text-center space-y-3">
            <span className="text-[10px] font-mono uppercase text-ink/40">Audit Score</span>
            <div className="font-display text-7xl font-bold tracking-tight text-ink">
              {loading ? "..." : score}
            </div>
            <p className="text-xs font-mono text-evidence font-semibold">
              {score >= 80 ? "EXCELLENT — ATS APPROVED" : score >= 50 ? "PASSED WITH WARNINGS" : "CRITICAL REVISIONS NEEDED"}
            </p>
            <div className="w-full bg-paper h-2 rounded overflow-hidden mt-4">
              <div 
                className={`h-full transition-all duration-500 ${score >= 80 ? 'bg-evidence' : score >= 50 ? 'bg-signal' : 'bg-caution'}`}
                style={{ width: `${score}%` }}
              />
            </div>
          </div>

          {/* JD Tailoring Panel */}
          <div className="bg-surface border border-line p-6 rounded-lg space-y-4">
            <h3 className="font-display text-md font-bold text-ink">Target Job Description</h3>
            <p className="text-xs text-ink/60 font-body leading-relaxed">
              Paste the target JD to run AI-assisted semantic gap extraction. It highlights keyword alignments and promoters.
            </p>

            {jdsList.length > 0 && (
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-ink/40">Load From JD Library</label>
                <select
                  onChange={(e) => {
                    const selected = jdsList.find(j => j.id === e.target.value);
                    if (selected) {
                      setJdText(selected.text);
                    }
                  }}
                  className="w-full text-xs font-mono border border-line rounded p-1.5 bg-paper focus:outline-none"
                  defaultValue=""
                >
                  <option value="">-- Choose saved JD --</option>
                  {jdsList.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.company ? `[${j.company}] ` : ""}{j.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <textarea
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              placeholder="Paste Job Description here..."
              className="w-full h-32 border border-line rounded p-2.5 text-xs font-mono focus:outline-none"
            />
            <button
              onClick={() => handleAnalyze(resume)}
              disabled={loading}
              className="w-full py-2 bg-ink text-white font-mono text-xs font-semibold hover:opacity-95 rounded transition flex items-center justify-center gap-1.5"
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
              <span>Tailor Analysis</span>
            </button>

            <div className="border-t border-line/50 pt-3 mt-2 space-y-2">
              <span className="text-[10px] font-mono font-semibold text-ink/60 uppercase block">Save to JD Library</span>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Job Title"
                  value={jdTitle}
                  onChange={(e) => setJdTitle(e.target.value)}
                  className="w-full text-xs font-mono border border-line rounded p-1.5 bg-paper focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Company"
                  value={jdCompany}
                  onChange={(e) => setJdCompany(e.target.value)}
                  className="w-full text-xs font-mono border border-line rounded p-1.5 bg-paper focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={handleSaveJD}
                disabled={savingJd || !jdText.trim()}
                className="w-full py-1.5 border border-line hover:bg-paper font-mono text-[10px] text-ink/80 rounded transition flex items-center justify-center gap-1"
              >
                <Save size={10} />
                <span>{savingJd ? "Saving..." : "Save Job Description"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right: Category Scores & Findings Checklist */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-surface border border-line p-6 rounded-lg space-y-6">
            <h3 className="font-display text-lg font-bold">Rubric Index</h3>
            
            {scoring && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(scoring.breakdown).map(([cat, val]) => (
                  <div key={cat} className="border border-line rounded p-4 bg-paper/20 space-y-2">
                    <div className="flex justify-between items-center text-xs font-mono text-ink/80">
                      <span className="capitalize">{cat.replace("_", " ")}</span>
                      <span className="font-bold">{val}/100</span>
                    </div>
                    <div className="w-full bg-line h-1 rounded overflow-hidden">
                      <div 
                        className={`h-full ${val >= 80 ? 'bg-evidence' : val >= 50 ? 'bg-signal' : 'bg-caution'}`}
                        style={{ width: `${val}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Detailed Findings list */}
          <div className="bg-surface border border-line p-6 rounded-lg space-y-4">
            <h3 className="font-display text-lg font-bold">Flagged Gaps Checklist</h3>
            <div className="divide-y divide-line">
              {scoring?.findings.filter(f => f.status === "open").map((find) => (
                <div key={find.id} className="py-4 flex gap-3 items-start">
                  <AlertTriangle size={16} className={`shrink-0 mt-0.5 ${find.severity === 'high' ? 'text-caution' : 'text-evidence'}`} />
                  <div className="flex-1 space-y-1">
                    <div className="flex gap-2 items-center">
                      <span className="font-mono text-[9px] uppercase bg-paper px-1.5 py-0.5 rounded text-ink/60">
                        {find.category}
                      </span>
                      <span className="font-mono text-[9px] uppercase text-ink/40">
                        {find.severity}
                      </span>
                    </div>
                    <p className="text-sm font-body text-ink">{find.message}</p>
                  </div>
                  <Link 
                    href={`/resume/${id}/fix`}
                    className="text-xs font-mono text-signal hover:underline flex items-center gap-0.5"
                  >
                    <span>Fix</span>
                    <ChevronRight size={12} />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
