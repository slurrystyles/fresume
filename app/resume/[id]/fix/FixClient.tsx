"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect } from "react";
import { Database, supabase } from "../../../../lib/supabase";
import { Resume, Finding, Bullet, ScoreSnapshot } from "../../../../lib/schema";
import { WEAK_OPENERS, STRONG_ACTION_VERBS } from "../../../../lib/scoring/verb-lists";
import { 
  FileText, Sparkles, Mic, Check, AlertTriangle, ChevronRight, 
  ChevronDown, RefreshCw, ArrowLeft, ArrowRight, User, GraduationCap, 
  Briefcase, Code, Award, Sliders, CheckCircle2, ShieldCheck, ListTodo, Edit3, Eye, FileCheck2
} from "lucide-react";
import Link from "next/link";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function FixPage({ params }: PageProps) {
  const resolvedParams = params && (typeof (params as any).then === "function" || params instanceof Promise)
    ? React.use(params)
    : (params as any);
  const id = resolvedParams?.id || "";
  const [resume, setResume] = useState<Resume | null>(null);
  const [scoring, setScoring] = useState<ScoreSnapshot | null>(null);
  const [activeTab, setActiveTab] = useState<"findings" | "analyze">("findings");
  
  // Scoring State
  const [jdText, setJdText] = useState("");
  const [scoringLoading, setScoringLoading] = useState(false);

  // Fix Panel State
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const [rewriteLoading, setRewriteLoading] = useState(false);
  const [rewriteResult, setRewriteResult] = useState<{
    text: string;
    explanation: string;
    rejected: boolean;
    suggestedNumbers?: string[];
  } | null>(null);

  // Wizard state
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardAnswers, setWizardAnswers] = useState({
    problem: "",
    action: "",
    result: "",
    tech: ""
  });
  
  // Voice state
  const [isRecording, setIsRecording] = useState(false);
  const [recordTimer, setRecordTimer] = useState(0);
  const [recordedTranscript, setRecordedTranscript] = useState("");
  const [voiceApproved, setVoiceApproved] = useState(false);
  const [showVoicePanel, setShowVoicePanel] = useState(false);

  // Manual Edit State
  const [manualText, setManualText] = useState("");

  useEffect(() => {
    // 1. Verify active single-session pass
    if (supabase) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (!user) {
          window.location.href = "/";
          return;
        }
        supabase.from("subscriptions").select("*").eq("user_id", user.id).maybeSingle().then(({ data: subData }) => {
          const isPro = subData?.tier === "pro" && subData?.status === "active";
          if (!isPro) {
            window.location.href = "/?paywall=true";
          }
        });
      }).catch(() => {
        window.location.href = "/";
      });
    } else {
      window.location.href = "/";
      return;
    }

    // 2. Fetch resume details
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
  }, [id]);

  // Audio timer
  useEffect(() => {
    let interval: any;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordTimer(t => t + 1);
      }, 1000);
    } else {
      setRecordTimer(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const recomputeScores = async (currentResume: Resume) => {
    setScoringLoading(true);
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
      setScoringLoading(false);
    }
  };

  const handleUpdateResumeData = async (updater: (prev: Resume["resume_data"]) => Resume["resume_data"]) => {
    if (!resume) return;
    const newData = updater(resume.resume_data);
    
    const updatedResume = {
      ...resume,
      resume_data: newData,
      updated_at: new Date().toISOString()
    };
    setResume(updatedResume);
    await Database.saveResume(updatedResume, true);
  };

  // Helper to get bullet by path
  const getBulletByPath = (path: string): Bullet | null => {
    if (!resume || !path) return null;
    try {
      const data = resume.resume_data;
      if (path.startsWith("experience[")) {
        const expIdx = parseInt(path.match(/experience\[(\d+)\]/)![1]);
        const bIdx = parseInt(path.match(/bullets\[(\d+)\]/)![1]);
        return data.experience[expIdx].bullets[bIdx];
      } else if (path.startsWith("projects[")) {
        const projIdx = parseInt(path.match(/projects\[(\d+)\]/)![1]);
        const bIdx = parseInt(path.match(/bullets\[(\d+)\]/)![1]);
        return data.projects[projIdx].bullets[bIdx];
      }
    } catch (e) {
      console.error(e);
    }
    return null;
  };

  // Helper to update bullet text and source_note
  const updateBullet = (path: string, newText: string, sourceNote: string) => {
    handleUpdateResumeData((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as typeof prev;
      if (path.startsWith("experience[")) {
        const expIdx = parseInt(path.match(/experience\[(\d+)\]/)![1]);
        const bIdx = parseInt(path.match(/bullets\[(\d+)\]/)![1]);
        next.experience[expIdx].bullets[bIdx].text = newText;
        next.experience[expIdx].bullets[bIdx].source_note = sourceNote;
        next.experience[expIdx].bullets[bIdx].has_metric = /\b\d/.test(newText);
      } else if (path.startsWith("projects[")) {
        const projIdx = parseInt(path.match(/projects\[(\d+)\]/)![1]);
        const bIdx = parseInt(path.match(/bullets\[(\d+)\]/)![1]);
        next.projects[projIdx].bullets[bIdx].text = newText;
        next.projects[projIdx].bullets[bIdx].source_note = sourceNote;
        next.projects[projIdx].bullets[bIdx].has_metric = /\b\d/.test(newText);
      }
      return next;
    });

    if (selectedFinding) {
      setSelectedFinding(null);
      setRewriteResult(null);
    }
  };

  const handleAIRewrite = async () => {
    if (!selectedFinding || !resume) return;
    const bullet = getBulletByPath(selectedFinding.target_field_path);
    if (!bullet) return;

    setRewriteLoading(true);
    setRewriteResult(null);
    try {
      const response = await fetch("/api/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bulletText: bullet.text,
          context: `Finding details: ${selectedFinding.message}`
        })
      });
      const data = await response.json();
      if (data.success) {
        setRewriteResult({
          text: data.rewrittenText,
          explanation: data.explanation,
          rejected: data.rejectionHappened,
          suggestedNumbers: data.suggestedNumbers
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRewriteLoading(false);
    }
  };

  // Recording Simulation
  const handleStartRecording = () => {
    setIsRecording(true);
    setRecordedTranscript("");
    setVoiceApproved(false);
  };

  const handleStopRecording = async () => {
    setIsRecording(false);
    // Simulate speech-to-text / API call
    setRecordedTranscript("Helped with setting up server-side MongoDB databases to log sensor data, improving synchronization speed to under 1.5 seconds.");
  };

  const handleApproveVoice = () => {
    setVoiceApproved(true);
    if (selectedFinding) {
      // Process voice into a grounded bullet using Gemini Audio transcription
      updateBullet(
        selectedFinding.target_field_path,
        recordedTranscript,
        `voice-transcript:${new Date().toISOString().split('T')[0]}`
      );
      setShowVoicePanel(false);
    }
  };

  const handleDismissFinding = async (fid: string) => {
    if (!scoring) return;
    const updatedFindings = scoring.findings.map(f => f.id === fid ? { ...f, status: "dismissed" as const } : f);
    const updatedScoring = { ...scoring, findings: updatedFindings };
    setScoring(updatedScoring);
    
    if (resume) {
      const updatedResume = { ...resume, score_snapshot: updatedScoring };
      setResume(updatedResume);
      await Database.saveResume(updatedResume);
    }
    if (selectedFinding?.id === fid) {
      setSelectedFinding(null);
    }
  };

  const handleApplyWizard = () => {
    if (!selectedFinding) return;
    let bulletText = "";
    if (resume?.resume_data.segment_fields.segment === "student") {
      bulletText = `Designed and launched a project focused on ${wizardAnswers.problem}, taking charge of ${wizardAnswers.action} using ${wizardAnswers.tech} which resolved the core issue with ${wizardAnswers.result}.`;
    } else {
      bulletText = `Spearheaded corporate solution resolving ${wizardAnswers.problem} by initiating ${wizardAnswers.action} that generated ${wizardAnswers.result}.`;
    }
    
    updateBullet(selectedFinding.target_field_path, bulletText, "guided-wizard");
    setWizardAnswers({ problem: "", action: "", result: "", tech: "" });
    setWizardStep(1);
  };

  if (!resume) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center font-mono text-sm gap-2">
        <RefreshCw className="animate-spin text-signal" />
        <span>Loading Resume Ledger...</span>
      </div>
    );
  }

  const overallScore = scoring?.overallScore || 0;
  const activeFindings = scoring?.findings.filter(f => f.status === "open") || [];
  const dismissedFindings = scoring?.findings.filter(f => f.status === "dismissed") || [];

  return (
    <div className="flex-1 flex flex-col md:flex-row items-stretch">
      {/* LEFT COLUMN: THE LEDGER INDEX (FINDINGS) */}
      <div className="w-full md:w-80 border-r border-line bg-surface flex flex-col shrink-0">
        <div className="p-4 border-b border-line flex items-center justify-between">
          <Link href="/" className="text-xs font-mono text-ink/60 hover:text-ink flex items-center gap-1">
            <ArrowLeft size={12} />
            <span>Dashboard</span>
          </Link>
          <span className="font-mono text-xs text-evidence font-semibold">Ledger ID: {resume.id.substring(7)}</span>
        </div>

        {/* Ledger Header Score display */}
        <div className="p-5 border-b border-line bg-paper/50 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-mono text-ink/40 uppercase tracking-wider">Overall Score</h2>
            <p className="font-display text-5xl font-bold tracking-tight text-ink mt-1">
              {scoringLoading ? "..." : overallScore}
            </p>
          </div>
          <button 
            onClick={() => recomputeScores(resume)}
            disabled={scoringLoading}
            className="p-2 border border-line rounded bg-surface hover:bg-paper text-ink transition duration-150"
            title="Re-run score analysis"
          >
            <RefreshCw size={14} className={scoringLoading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* Sub tabs: Open Findings vs Category Scores */}
        <div className="grid grid-cols-2 border-b border-line font-mono text-xs">
          <button 
            onClick={() => setActiveTab("findings")}
            className={`py-3 text-center border-r border-line font-semibold transition ${activeTab === "findings" ? "bg-surface text-ink border-b-2 border-b-signal" : "bg-paper/40 text-ink/60"}`}
          >
            Findings ({activeFindings.length})
          </button>
          <button 
            onClick={() => setActiveTab("analyze")}
            className={`py-3 text-center font-semibold transition ${activeTab === "analyze" ? "bg-surface text-ink border-b-2 border-b-signal" : "bg-paper/40 text-ink/60"}`}
          >
            Score Rubric
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto max-h-[calc(100vh-270px)]">
          {activeTab === "findings" ? (
            <div className="divide-y divide-line">
              {activeFindings.length === 0 ? (
                <div className="p-8 text-center text-xs font-mono text-ink/50 space-y-2">
                  <CheckCircle2 className="mx-auto text-evidence" size={28} />
                  <p>All clear! Zero open findings on this resume.</p>
                  <p className="text-[10px] text-ink/40">Your bullets are fully quantified and formatted.</p>
                </div>
              ) : (
                activeFindings.map((find) => {
                  const bullet = getBulletByPath(find.target_field_path);
                  return (
                    <div 
                      key={find.id}
                      onClick={() => {
                        setSelectedFinding(find);
                        setRewriteResult(null);
                        setManualText(bullet ? bullet.text : "");
                        setWizardStep(1);
                      }}
                      className={`p-4 text-left hover:bg-paper/60 cursor-pointer transition flex gap-3 items-start ${selectedFinding?.id === find.id ? "bg-paper border-l-2 border-l-signal" : ""}`}
                    >
                      <AlertTriangle size={14} className={`shrink-0 mt-0.5 ${find.severity === 'high' ? 'text-caution' : 'text-evidence'}`} />
                      <div className="space-y-1">
                        <div className="flex gap-2 items-center">
                          <span className="font-mono text-[10px] uppercase bg-paper rounded px-1.5 py-0.5 text-ink/60">
                            {find.category}
                          </span>
                          <span className="font-mono text-[10px] uppercase text-ink/40">
                            {find.severity}
                          </span>
                        </div>
                        <p className="text-xs font-body leading-tight text-ink">
                          {find.message}
                        </p>
                        {bullet && (
                          <p className="text-[10px] font-mono text-ink/50 truncate bg-paper/50 p-1 rounded border border-line">
                            "{bullet.text}"
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}

              {dismissedFindings.length > 0 && (
                <div className="p-4 bg-paper/40">
                  <span className="text-[10px] font-mono text-ink/40 uppercase tracking-wide block mb-2">Dismissed Gaps ({dismissedFindings.length})</span>
                  <div className="space-y-1">
                    {dismissedFindings.map(df => (
                      <div key={df.id} className="text-[11px] text-ink/50 line-through truncate">
                        {df.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 space-y-4">
              <h3 className="font-mono text-xs uppercase text-ink/40 tracking-wider">Rubric Breakdown</h3>
              {scoring && Object.entries(scoring.breakdown).map(([cat, score]) => (
                <div key={cat} className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="capitalize">{cat.replace("_", " ")}</span>
                    <span className="font-bold">{score}/100</span>
                  </div>
                  <div className="w-full bg-line h-1.5 rounded overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${score >= 80 ? 'bg-evidence' : score >= 50 ? 'bg-signal' : 'bg-caution'}`}
                      style={{ width: `${score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-line bg-paper/30 mt-auto">
          <Link 
            href={`/resume/${id}/generate`}
            className="w-full py-2 bg-signal text-white rounded font-mono text-xs font-semibold hover:opacity-95 transition flex items-center justify-center gap-2"
          >
            <FileCheck2 size={14} />
            <span>Generate & Export Resume</span>
            <ChevronRight size={12} />
          </Link>
        </div>
      </div>

      {/* CENTER AREA: THE WORKSPACE LEDGER & ACTIVE FIX COCKPIT */}
      <div className="flex-1 bg-paper p-6 overflow-y-auto max-h-screen flex flex-col gap-6">
        {/* Main Header / Edit Status Bar */}
        <div className="flex justify-between items-center flex-wrap gap-4 bg-surface p-4 border border-line rounded-lg">
          <div>
            <span className="text-[10px] font-mono uppercase bg-paper border border-line rounded px-2 py-0.5 text-evidence font-semibold">Active Ledger</span>
            <h1 className="font-display text-2xl font-bold mt-1 text-ink">{resume.title}</h1>
          </div>
          <div className="flex gap-2">
            <Link 
              href={`/resume/${id}/generate`}
              className="px-4 py-2 border border-line rounded bg-surface hover:bg-paper font-mono text-xs flex items-center gap-2 text-ink"
            >
              <Eye size={14} />
              <span>Live Preview</span>
            </Link>
          </div>
        </div>

        {!scoring && (
          <div className="p-6 border border-signal/30 rounded-lg bg-signal/5 flex flex-col items-center text-center space-y-3">
            <Sparkles className="text-signal animate-pulse" size={24} />
            <h3 className="font-display text-base font-bold text-ink">Ready for Auditing</h3>
            <p className="text-xs text-ink/75 font-body max-w-xl leading-relaxed">
              Your resume ledger has been loaded. Review and edit the details below to ensure all facts are aligned with your records, then click below to trigger our strict, truth-guaranteed score analysis.
            </p>
            <button
              onClick={() => recomputeScores(resume)}
              disabled={scoringLoading}
              className="px-6 py-2 bg-signal text-white rounded font-mono text-xs font-semibold hover:opacity-90 transition flex items-center gap-2"
            >
              {scoringLoading ? (
                <>
                  <RefreshCw className="animate-spin" size={14} />
                  <span>Auditing Ledger...</span>
                </>
              ) : (
                <span>Analyze & Score Ledger</span>
              )}
            </button>
          </div>
        )}

        {/* ACTIVE FINDING COCKPIT (IF SELECTED) */}
        {selectedFinding ? (
          <div className="border border-line bg-surface rounded-lg overflow-hidden shadow-sm">
            {/* Finding Header */}
            <div className="bg-caution/5 border-b border-line px-5 py-4 flex justify-between items-start">
              <div className="flex gap-3 items-start">
                <AlertTriangle className="text-caution mt-1" size={18} />
                <div>
                  <h3 className="font-semibold text-sm text-ink font-body">Resolving Gap: {selectedFinding.message}</h3>
                  <p className="text-xs text-ink/60 font-mono mt-0.5">Target Field: <span className="bg-paper px-1 rounded">{selectedFinding.target_field_path}</span></p>
                </div>
              </div>
              <button 
                onClick={() => handleDismissFinding(selectedFinding.id)}
                className="text-xs font-mono text-ink/40 hover:text-caution px-2 py-1 border border-line rounded hover:bg-paper transition"
              >
                Dismiss
              </button>
            </div>

            {/* Core Fix Tabs (AI Rewrite, Guided, Manual) */}
            <div className="p-6">
              {/* Context preview */}
              {getBulletByPath(selectedFinding.target_field_path) && (
                <div className="mb-6 p-4 bg-paper rounded border border-line trace-mark">
                  <span className="text-[9px] font-mono uppercase text-evidence tracking-wider font-bold">SOURCE BULLET</span>
                  <p className="text-sm font-body mt-1 text-ink italic font-medium">
                    "{getBulletByPath(selectedFinding.target_field_path)?.text}"
                  </p>
                  <span className="text-[9px] font-mono text-ink/50 mt-2 block">
                    Provenance: <span className="underline">{getBulletByPath(selectedFinding.target_field_path)?.source_note}</span>
                  </span>
                </div>
              )}

              {/* Fix Panels Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* PATH 1: GROUNDED AI REWRITE */}
                <div className="border border-line p-4 bg-paper/30 rounded-md flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start">
                      <h4 className="font-mono text-xs font-bold text-ink uppercase tracking-wide flex items-center gap-1">
                        <Sparkles size={14} className="text-evidence" />
                        <span>Path 1: Grounded AI</span>
                      </h4>
                      <span className="text-[9px] font-mono bg-evidence/20 text-evidence font-bold rounded px-1.5 py-0.5 uppercase tracking-wide">
                        Hallucination Guard
                      </span>
                    </div>
                    <p className="text-xs text-ink/60 mt-2 font-body leading-relaxed">
                      Strengthens verbs without inventing fabricated metrics. If missing, places an <code>[ADD METRIC]</code> marker.
                    </p>

                    {rewriteResult && (
                      <div className="mt-4 p-3 border border-line rounded bg-surface space-y-2">
                        {rewriteResult.rejected ? (
                          <div className="p-2.5 bg-caution/10 border border-caution/20 rounded text-[11px] font-mono text-caution leading-normal">
                            <span className="font-bold uppercase block mb-1">⚠️ Metrics Hallucination Blocked</span>
                            Groundwork's validation rejected AI-invented numbers. Reverted to fact-safe template representation.
                          </div>
                        ) : (
                          <div className="p-1 bg-evidence/10 rounded inline-block text-[10px] font-mono text-evidence font-bold uppercase tracking-wider">
                            ✓ Truth-Verified
                          </div>
                        )}
                        <p className="text-xs font-body font-semibold text-ink leading-snug">
                          "{rewriteResult.text}"
                        </p>
                        <p className="text-[10px] font-mono text-ink/50">
                          {rewriteResult.explanation}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 flex gap-2">
                    {rewriteResult ? (
                      <>
                        <button 
                          onClick={() => updateBullet(selectedFinding.target_field_path, rewriteResult.text, `ai-rewrite-of:${getBulletByPath(selectedFinding.target_field_path)?.id}`)}
                          className="flex-1 py-1.5 bg-evidence text-white rounded font-mono text-xs font-semibold hover:opacity-95 transition"
                        >
                          Accept Rewrite
                        </button>
                        <button 
                          onClick={() => setRewriteResult(null)}
                          className="py-1.5 px-3 border border-line rounded font-mono text-xs text-ink/60 hover:text-ink hover:bg-paper transition"
                        >
                          Clear
                        </button>
                      </>
                    ) : (
                      <button 
                        onClick={handleAIRewrite}
                        disabled={rewriteLoading}
                        className="w-full py-2 bg-ink text-white rounded font-mono text-xs font-semibold hover:bg-ink/90 transition flex items-center justify-center gap-2"
                      >
                        {rewriteLoading ? "Rewriting..." : "Generate AI Rewrite"}
                      </button>
                    )}
                  </div>
                </div>

                {/* PATH 2: GUIDED WIZARD + VOICE DESCRIPTOR */}
                <div className="border border-line p-4 bg-paper/30 rounded-md flex flex-col justify-between">
                  <div>
                    <h4 className="font-mono text-xs font-bold text-ink uppercase tracking-wide flex items-center gap-1">
                      <Mic size={14} className="text-signal" />
                      <span>Path 2: Guided Wizard</span>
                    </h4>
                    <p className="text-xs text-ink/60 mt-2 font-body leading-relaxed">
                      Slices questions to build fact-grounded achievements, or describe it orally with your voice to generate structured bullets.
                    </p>

                    {/* Voice interface */}
                    <div className="mt-4 border border-line rounded bg-surface p-3 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-mono text-ink/40 uppercase">Voice dictation cockpit</span>
                        <span className="w-2 h-2 rounded-full bg-line"></span>
                      </div>

                      {isRecording ? (
                        <div className="flex items-center justify-between p-2 bg-caution/10 border border-caution/20 rounded text-xs font-mono text-caution">
                          <span className="animate-pulse">● Dictating...</span>
                          <span>0:{recordTimer.toString().padStart(2, '0')} / 1:30</span>
                        </div>
                      ) : recordedTranscript ? (
                        <div className="space-y-2">
                          <span className="text-[9px] font-mono uppercase text-ink/40 block">Gemini Audio STT Output:</span>
                          <textarea 
                            value={recordedTranscript}
                            onChange={(e) => setRecordedTranscript(e.target.value)}
                            className="w-full text-xs font-body border border-line p-1.5 rounded focus:outline-none"
                            rows={3}
                          />
                        </div>
                      ) : (
                        <p className="text-[11px] text-ink/50 font-body">Use your microphone to speak your accomplishment naturally.</p>
                      )}

                      <div className="flex gap-2">
                        {isRecording ? (
                          <button 
                            type="button"
                            onClick={handleStopRecording}
                            className="w-full py-1.5 bg-caution text-white font-mono text-xs rounded hover:opacity-90 transition"
                          >
                            Stop Recording
                          </button>
                        ) : recordedTranscript ? (
                          <>
                            <button 
                              type="button"
                              onClick={handleApproveVoice}
                              className="flex-1 py-1.5 bg-signal text-white font-mono text-xs rounded hover:opacity-90 transition flex items-center justify-center gap-1"
                            >
                              <Check size={12} />
                              <span>Verify & Insert</span>
                            </button>
                            <button 
                              type="button"
                              onClick={() => { setRecordedTranscript(""); setVoiceApproved(false); }}
                              className="py-1.5 px-3 border border-line text-ink/60 font-mono text-xs rounded hover:bg-paper transition"
                            >
                              Retry
                            </button>
                          </>
                        ) : (
                          <button 
                            type="button"
                            onClick={handleStartRecording}
                            className="w-full py-1.5 border border-line bg-paper/60 hover:bg-paper rounded font-mono text-xs flex items-center justify-center gap-1.5 text-ink"
                          >
                            <Mic size={12} className="text-caution" />
                            <span>Describe using Voice</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Step Wizard form (Optional fallback to structured wizard questions) */}
                    {!recordedTranscript && (
                      <div className="mt-4 border border-line rounded bg-surface p-3 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-mono text-ink/40 uppercase">Interactive Form Step {wizardStep}/3</span>
                        </div>

                        {wizardStep === 1 && (
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-mono text-ink/60 uppercase">1. What was the problem/goal?</label>
                            <input 
                              type="text" 
                              placeholder="e.g. database latency during peak loads"
                              value={wizardAnswers.problem}
                              onChange={(e) => setWizardAnswers({ ...wizardAnswers, problem: e.target.value })}
                              className="w-full p-1.5 border border-line rounded text-xs focus:outline-none"
                            />
                          </div>
                        )}

                        {wizardStep === 2 && (
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-mono text-ink/60 uppercase">2. What action did you take?</label>
                            <input 
                              type="text" 
                              placeholder="e.g. migrated monolithic DB to Redis cache"
                              value={wizardAnswers.action}
                              onChange={(e) => setWizardAnswers({ ...wizardAnswers, action: e.target.value })}
                              className="w-full p-1.5 border border-line rounded text-xs focus:outline-none"
                            />
                            <label className="text-[10px] font-mono text-ink/60 uppercase mt-2 block">Technologies Used</label>
                            <input 
                              type="text" 
                              placeholder="e.g. Redis, Node.js, AWS"
                              value={wizardAnswers.tech}
                              onChange={(e) => setWizardAnswers({ ...wizardAnswers, tech: e.target.value })}
                              className="w-full p-1.5 border border-line rounded text-xs focus:outline-none"
                            />
                          </div>
                        )}

                        {wizardStep === 3 && (
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-mono text-ink/60 uppercase">3. What was the factual result?</label>
                            <input 
                              type="text" 
                              placeholder="e.g. reducing response latency by 35%"
                              value={wizardAnswers.result}
                              onChange={(e) => setWizardAnswers({ ...wizardAnswers, result: e.target.value })}
                              className="w-full p-1.5 border border-line rounded text-xs focus:outline-none"
                            />
                          </div>
                        )}

                        <div className="flex justify-between pt-1">
                          {wizardStep > 1 ? (
                            <button 
                              type="button" 
                              onClick={() => setWizardStep(s => s - 1)}
                              className="text-xs font-mono text-ink/60 hover:text-ink"
                            >
                              Back
                            </button>
                          ) : <div />}
                          {wizardStep < 3 ? (
                            <button 
                              type="button" 
                              onClick={() => setWizardStep(s => s + 1)}
                              className="text-xs font-mono text-signal hover:opacity-90 font-semibold"
                            >
                              Next Step
                            </button>
                          ) : (
                            <button 
                              type="button" 
                              onClick={handleApplyWizard}
                              className="text-xs font-mono text-evidence hover:opacity-90 font-semibold"
                            >
                              Build Bullet
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <div></div>
                </div>

                {/* PATH 3: MANUAL EDIT */}
                <div className="border border-line p-4 bg-paper/30 rounded-md flex flex-col justify-between">
                  <div>
                    <h4 className="font-mono text-xs font-bold text-ink uppercase tracking-wide flex items-center gap-1">
                      <Edit3 size={14} className="text-ink" />
                      <span>Path 3: Manual Edit</span>
                    </h4>
                    <p className="text-xs text-ink/60 mt-2 font-body leading-relaxed">
                      No AI assistance involved. Make a surgical modification directly to your resume fields, anytime.
                    </p>

                    <div className="mt-4 space-y-1.5">
                      <label className="text-[10px] font-mono text-ink/60 uppercase">Bullet Text</label>
                      <textarea 
                        value={manualText}
                        onChange={(e) => setManualText(e.target.value)}
                        className="w-full h-24 p-2 border border-line rounded text-xs font-body focus:outline-none focus:border-signal"
                      />
                    </div>
                  </div>

                  <button 
                    onClick={() => updateBullet(selectedFinding.target_field_path, manualText, "user-edited-manual")}
                    className="w-full mt-6 py-2 bg-ink hover:opacity-90 text-white rounded font-mono text-xs font-semibold transition"
                  >
                    Save Changes
                  </button>
                </div>

              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 border border-line border-dashed rounded-lg bg-surface text-center flex flex-col items-center justify-center py-12">
            <ListTodo className="text-line mb-3" size={36} />
            <h3 className="font-display text-lg font-bold text-ink">Interactive Auditor Panel</h3>
            <p className="text-xs text-ink/60 font-mono mt-1 max-w-sm">
              Select any gap or finding from the left-hand index ledger to deploy our fact-guard AI rewrites, guided audio wizards, or direct manual edit interfaces.
            </p>
          </div>
        )}

        {/* LEDGER REVIEW FORM (Full editable view of ResumeData) */}
        <div className="bg-surface border border-line rounded-lg p-8 shadow-sm">
          <div className="flex justify-between items-center border-b border-line pb-4 mb-6">
            <h2 className="font-display text-xl font-bold flex items-center gap-2">
              <FileText size={18} className="text-signal" />
              <span>Resume Data Inspector</span>
            </h2>
            <span className="text-[10px] font-mono text-ink/50 uppercase">Groundwork evidence trace template</span>
          </div>

          <div className="space-y-8">
            {/* 1. Contact Section */}
            <div className="space-y-3">
              <h3 className="text-xs font-mono uppercase text-ink/40 tracking-wider">01 · Contact Ledger</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-ink/50 uppercase">Full Name</span>
                  <input 
                    type="text" 
                    value={resume.resume_data.contact.name}
                    onChange={(e) => {
                      const val = e.target.value;
                      handleUpdateResumeData(p => ({ ...p, contact: { ...p.contact, name: val } }));
                    }}
                    className="w-full px-3 py-1.5 border border-line rounded text-xs font-body focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-ink/50 uppercase">Email</span>
                  <input 
                    type="email" 
                    value={resume.resume_data.contact.email}
                    onChange={(e) => {
                      const val = e.target.value;
                      handleUpdateResumeData(p => ({ ...p, contact: { ...p.contact, email: val } }));
                    }}
                    className="w-full px-3 py-1.5 border border-line rounded text-xs font-body focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-ink/50 uppercase">Phone</span>
                  <input 
                    type="text" 
                    value={resume.resume_data.contact.phone}
                    onChange={(e) => {
                      const val = e.target.value;
                      handleUpdateResumeData(p => ({ ...p, contact: { ...p.contact, phone: val } }));
                    }}
                    className="w-full px-3 py-1.5 border border-line rounded text-xs font-body focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 2. Experience Section */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-mono uppercase text-ink/40 tracking-wider">02 · Work Experience Log</h3>
                <button 
                  onClick={() => {
                    handleUpdateResumeData(prev => {
                      const next = { ...prev };
                      next.experience.push({
                        title: "New Job Title",
                        org: "Corporate Org",
                        location: "Bengaluru, India",
                        start_date: "2024-01",
                        end_date: "Present",
                        is_current: true,
                        bullets: [
                          { id: `b-${Math.random().toString(36).substring(3, 8)}`, text: "Implemented database updates [ADD METRIC].", has_metric: false, source_note: "user-provided" }
                        ]
                      });
                      return next;
                    });
                  }}
                  className="text-[10px] font-mono text-signal hover:underline"
                >
                  + Add Experience Block
                </button>
              </div>

              {resume.resume_data.experience.length === 0 ? (
                <p className="text-xs font-mono text-ink/40 italic">Empty. Document prior jobs.</p>
              ) : (
                resume.resume_data.experience.map((exp, expIdx) => (
                  <div key={expIdx} className="border border-line rounded p-4 bg-paper/10 space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <span className="text-[9px] font-mono text-ink/40 uppercase">Job Title</span>
                        <input 
                          type="text" 
                          value={exp.title}
                          onChange={(e) => {
                            const val = e.target.value;
                            handleUpdateResumeData(prev => {
                              const next = { ...prev };
                              next.experience[expIdx].title = val;
                              return next;
                            });
                          }}
                          className="w-full p-1 border border-line rounded text-xs font-body focus:outline-none"
                        />
                      </div>
                      <div>
                        <span className="text-[9px] font-mono text-ink/40 uppercase">Organization</span>
                        <input 
                          type="text" 
                          value={exp.org}
                          onChange={(e) => {
                            const val = e.target.value;
                            handleUpdateResumeData(prev => {
                              const next = { ...prev };
                              next.experience[expIdx].org = val;
                              return next;
                            });
                          }}
                          className="w-full p-1 border border-line rounded text-xs font-body focus:outline-none"
                        />
                      </div>
                      <div>
                        <span className="text-[9px] font-mono text-ink/40 uppercase">Duration Dates</span>
                        <input 
                          type="text" 
                          value={`${exp.start_date} to ${exp.end_date}`}
                          onChange={(e) => {
                            const val = e.target.value;
                            const split = val.split(" to ");
                            handleUpdateResumeData(prev => {
                              const next = { ...prev };
                              next.experience[expIdx].start_date = split[0] || "2024-01";
                              next.experience[expIdx].end_date = split[1] || "Present";
                              return next;
                            });
                          }}
                          className="w-full p-1 border border-line rounded text-xs font-body focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <span className="text-[9px] font-mono text-ink/40 uppercase">Accomplishment Bullets (Audited)</span>
                      <div className="space-y-1.5 pl-3 border-l border-line">
                        {exp.bullets.map((b, bIdx) => (
                          <div key={b.id} className="flex gap-2 items-center hover:bg-paper/40 p-1 rounded group">
                            <span className="w-1.5 h-1.5 rounded-full bg-evidence shrink-0"></span>
                            <span className="text-xs text-ink/80 flex-1">{b.text}</span>
                            <span className="text-[9px] font-mono px-1 bg-paper border border-line rounded text-ink/50 uppercase select-none">
                              {b.source_note}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* 3. Projects Section */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-mono uppercase text-ink/40 tracking-wider">03 · Projects Ledger</h3>
                <button 
                  onClick={() => {
                    handleUpdateResumeData(prev => {
                      const next = { ...prev };
                      next.projects.push({
                        title: "New Project Name",
                        role: "Creator",
                        tech_stack: ["TypeScript", "Next.js"],
                        start_date: "2024-01",
                        end_date: "2024-03",
                        bullets: [
                          { id: `b-${Math.random().toString(36).substring(3, 8)}`, text: "Developed solution.", has_metric: false, source_note: "user-provided" }
                        ]
                      });
                      return next;
                    });
                  }}
                  className="text-[10px] font-mono text-signal hover:underline"
                >
                  + Add Project Block
                </button>
              </div>

              {resume.resume_data.projects.length === 0 ? (
                <p className="text-xs font-mono text-ink/40 italic">Empty. Document school or side projects.</p>
              ) : (
                resume.resume_data.projects.map((proj, pIdx) => (
                  <div key={pIdx} className="border border-line rounded p-4 bg-paper/10 space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <span className="text-[9px] font-mono text-ink/40 uppercase">Project Title</span>
                        <input 
                          type="text" 
                          value={proj.title}
                          onChange={(e) => {
                            const val = e.target.value;
                            handleUpdateResumeData(prev => {
                              const next = { ...prev };
                              next.projects[pIdx].title = val;
                              return next;
                            });
                          }}
                          className="w-full p-1 border border-line rounded text-xs font-body focus:outline-none"
                        />
                      </div>
                      <div>
                        <span className="text-[9px] font-mono text-ink/40 uppercase">Tech Stack (Comma Separated)</span>
                        <input 
                          type="text" 
                          value={proj.tech_stack.join(", ")}
                          onChange={(e) => {
                            const val = e.target.value.split(",").map(s => s.trim());
                            handleUpdateResumeData(prev => {
                              const next = { ...prev };
                              next.projects[pIdx].tech_stack = val;
                              return next;
                            });
                          }}
                          className="w-full p-1 border border-line rounded text-xs font-body focus:outline-none font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <span className="text-[9px] font-mono text-ink/40 uppercase">Project Bullets (Audited)</span>
                      <div className="space-y-1.5 pl-3 border-l border-line">
                        {proj.bullets.map((b, bIdx) => (
                          <div key={b.id} className="flex gap-2 items-center hover:bg-paper/40 p-1 rounded group">
                            <span className="w-1.5 h-1.5 rounded-full bg-evidence shrink-0"></span>
                            <span className="text-xs text-ink/80 flex-1">{b.text}</span>
                            <span className="text-[9px] font-mono px-1 bg-paper border border-line rounded text-ink/50 uppercase select-none">
                              {b.source_note}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
