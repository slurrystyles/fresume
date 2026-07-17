"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect } from "react";
import { Database, supabase } from "../lib/supabase";
import { Resume } from "../lib/schema";
import { Plus, Trash2, ArrowRight, FileText, Sparkles, Upload, LogOut, Key, Mail, ShieldAlert } from "lucide-react";
import Link from "next/link";

export default function Dashboard() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showPaywallModal, setShowPaywallModal] = useState(false);
  const [sessionCompletedMsg, setSessionCompletedMsg] = useState(false);
  
  // Auth state
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  
  // Signup selections
  const [signupSegment, setSignupSegment] = useState<"student" | "professional">("professional");
  const [signupRegion, setSignupRegion] = useState("India");

  // Form state
  const [newTitle, setNewTitle] = useState("");
  const [segment, setSegment] = useState<"student" | "professional">("professional");
  const [market, setMarket] = useState<"india_campus" | "india_general" | "international">("india_general");
  
  // Import text state
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);

  // Check user session & query params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("paywall") === "true") {
      setShowPaywallModal(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (urlParams.get("session_completed") === "true") {
      setSessionCompletedMsg(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (!supabase) {
      setAuthLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
      if (session?.user) {
        loadData();
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadData();
      } else {
        setResumes([]);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const [subscription, setSubscription] = useState<any>(null);
  const [upgrading, setUpgrading] = useState(false);

  const loadData = async () => {
    try {
      const res = await Database.getResumes();
      setResumes(res);

      if (supabase) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: subData } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();
          setSubscription(subData || null);
        }
      }
    } catch (err: any) {
      console.error("Failed to load resumes:", err);
    }
  };

  const handleUpgradeToPro = async () => {
    if (!user) return;
    setUpgrading(true);
    try {
      // 1. Call API to create order
      const response = await fetch("/api/billing/razorpay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_order",
          userId: user.id,
          email: user.email,
          amount: 149900 // ₹1499.00 INR
        })
      });

      const orderData = await response.json();
      if (!orderData.success) {
        throw new Error(orderData.error || "Failed to create checkout order.");
      }

      // Check if we are running in real mode or simulated mode
      if (!orderData.real || orderData.keyId === "rzp_test_simulated") {
        // High-fidelity payment sandbox simulation
        const confirmSim = confirm(
          "🇮🇳 [SANDBOX MODE] Initiating India-First Razorpay Checkout Simulation.\n\n" +
          "Amount: ₹1,499.00 INR (Pro Ledger Plan)\n" +
          "Receipt ID: " + orderData.orderId + "\n\n" +
          "Click OK to simulate successful Razorpay webhook settlement & signature verification."
        );
        if (confirmSim) {
          const verifyResponse = await fetch("/api/billing/razorpay", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "verify_payment",
              userId: user.id,
              orderId: orderData.orderId
            })
          });
          const verifyData = await verifyResponse.json();
          if (verifyData.success) {
            alert("Payment successfully processed! You now have a Pro Truth-Grounded Ledger Plan.");
            loadData();
          } else {
            alert("Verification failed: " + verifyData.error);
          }
        }
        setUpgrading(false);
        return;
      }

      // Real checkout load
      const loadScript = () => {
        return new Promise((resolve) => {
          const script = document.createElement("script");
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.onload = () => resolve(true);
          script.onerror = () => resolve(false);
          document.body.appendChild(script);
        });
      };

      const loaded = await loadScript();
      if (!loaded) {
        alert("Failed to load Razorpay checkout script. Check your internet connection.");
        setUpgrading(false);
        return;
      }

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Groundwork Pro",
        description: "Truth-Grounded AI Resume Ledger - Premium Upgrade",
        order_id: orderData.orderId,
        handler: async function (response: any) {
          const verifyResponse = await fetch("/api/billing/razorpay", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "verify_payment",
              userId: user.id,
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature
            })
          });
          const verifyData = await verifyResponse.json();
          if (verifyData.success) {
            alert("Payment successfully verified! Your ledger account is upgraded to Pro.");
            loadData();
          } else {
            alert("Signature validation failed: " + verifyData.error);
          }
        },
        prefill: {
          email: user.email,
        },
        theme: {
          color: "#0F172A",
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();

    } catch (err: any) {
      console.error(err);
      alert("Billing error: " + err.message);
    } finally {
      setUpgrading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setAuthSubmitting(true);
    setAuthError(null);

    try {
      if (authMode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              segment: signupSegment,
              region: signupRegion
            }
          }
        });
        if (error) throw error;

        // Synchronously establish the user database record first to eliminate auth state race conditions
        if (data?.user) {
          const { error: insertError } = await supabase.from('users').insert({
            id: data.user.id,
            email: data.user.email || email,
            segment: signupSegment,
            region: signupRegion
          });
          if (insertError) {
            console.warn("Failed synchronous profile insertion, falling back to auto-creation:", insertError.message);
          }
        }

        alert("Registration successful! You are now logged in.");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (err: any) {
      setAuthError(err.message || "Authentication failed. Please verify credentials.");
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await Database.createNewResume(newTitle, segment, market);
      const list = await Database.getResumes();
      setResumes(list);
      setShowCreateModal(false);
      setNewTitle("");
      window.location.href = `/resume/${created.id}/fix`;
    } catch (err: any) {
      alert("Error building resume: " + err.message);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this resume? This cannot be undone.")) {
      try {
        await Database.deleteResume(id);
        const list = await Database.getResumes();
        setResumes(list);
      } catch (err: any) {
        alert("Error deleting resume: " + err.message);
      }
    }
  };

  const handleImportText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importText.trim()) return;
    setImporting(true);
    
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: importText }),
      });
      
      const data = await res.json();
      if (data.success && data.resume) {
        await Database.saveResume(data.resume);
        const list = await Database.getResumes();
        setResumes(list);
        setShowImportModal(false);
        setImportText("");
        window.location.href = `/resume/${data.resume.id}/fix`;
      } else {
        alert("Extraction failed: " + (data.error || "Unknown error"));
      }
    } catch (err: any) {
      console.error(err);
      alert("Error parsing resume text: " + err.message);
    } finally {
      setImporting(false);
    }
  };

  if (!supabase) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-950">
        <div className="max-w-md w-full bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-xl shadow-2xl p-8 text-center space-y-4">
          <ShieldAlert className="mx-auto text-rose-500" size={48} />
          <h2 className="font-display text-2xl font-bold text-white">Supabase Connection Required</h2>
          <p className="text-sm text-slate-400 font-mono leading-relaxed">
            Please configure <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in your environment parameters to initialize the database ledger.
          </p>
        </div>
      </div>
    );
  }

  const hasActiveAccess = subscription?.tier === "pro" && subscription?.status === "active";

  if (authLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-950 p-12">
        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
        <p className="text-xs font-mono text-slate-500 mt-4">Verifying security token...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-950 relative overflow-hidden">
        {/* Decorative background glows */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="max-w-md w-full bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl shadow-2xl p-8 space-y-6 relative z-10">
          <div className="text-center space-y-2">
            <h1 className="font-display text-4xl font-bold tracking-tight text-white bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 text-transparent">
              Fresume
            </h1>
            <p className="text-xs font-mono text-slate-400 uppercase tracking-widest font-semibold">
              Truth-Grounded AI Resume Ledger
            </p>
          </div>

          <div className="flex border-b border-slate-850">
            <button
              onClick={() => { setAuthMode("signin"); setAuthError(null); }}
              className={`flex-1 pb-3 text-sm font-mono transition-all ${authMode === "signin" ? "border-b-2 border-blue-500 text-blue-400 font-semibold" : "text-slate-500 hover:text-slate-400"}`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setAuthMode("signup"); setAuthError(null); }}
              className={`flex-1 pb-3 text-sm font-mono transition-all ${authMode === "signup" ? "border-b-2 border-blue-500 text-blue-400 font-semibold" : "text-slate-500 hover:text-slate-400"}`}
            >
              Create Account
            </button>
          </div>

          {authError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-400 font-mono leading-relaxed">
              {authError}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-mono uppercase text-slate-400">Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <Mail size={14} />
                </span>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-950/50 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500 font-sans transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-mono uppercase text-slate-400">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <Key size={14} />
                </span>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-950/50 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500 font-sans transition-all"
                />
              </div>
            </div>

            {authMode === "signup" && (
              <>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono uppercase text-slate-400">Career Segment</label>
                  <select
                    value={signupSegment}
                    onChange={(e) => setSignupSegment(e.target.value as "student" | "professional")}
                    className="w-full px-3 py-2 bg-slate-950/50 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500 font-sans transition-all"
                  >
                    <option value="professional" className="bg-slate-900 text-white">Professional (Experienced)</option>
                    <option value="student" className="bg-slate-900 text-white">Student (Campus/Fresher)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono uppercase text-slate-400">Target Region</label>
                  <select
                    value={signupRegion}
                    onChange={(e) => setSignupRegion(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950/50 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500 font-sans transition-all"
                  >
                    <option value="India" className="bg-slate-900 text-white">India</option>
                    <option value="USA" className="bg-slate-900 text-white">United States</option>
                    <option value="Europe" className="bg-slate-900 text-white">Europe</option>
                    <option value="Other" className="bg-slate-900 text-white">Other / International</option>
                  </select>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={authSubmitting}
              className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg font-mono text-sm shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all flex items-center justify-center gap-2"
            >
              {authSubmitting ? "Authenticating..." : authMode === "signup" ? "Create Account & Start" : "Authenticate"}
              <ArrowRight size={14} />
            </button>
          </form>

          <p className="text-[10px] text-slate-500 font-mono text-center">
            Secured via Supabase authentication. Your resume ledger is strictly private.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto w-full px-6 py-12 flex-1 flex flex-col justify-start bg-slate-950 relative overflow-hidden min-h-screen">
      {/* Background gradients */}
      <div className="absolute top-10 left-10 w-96 h-96 bg-blue-600/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-indigo-600/5 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Session completed notification */}
      {sessionCompletedMsg && (
        <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between text-sm text-emerald-400 font-mono leading-relaxed">
          <span>🎉 Session completed! Your Fresume was generated successfully. To build or export another resume, please activate a new session.</span>
          <button onClick={() => setSessionCompletedMsg(false)} className="text-emerald-400/60 hover:text-emerald-400 ml-4">✕</button>
        </div>
      )}

      {/* Hero / Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 border-b border-slate-900 pb-8 z-10 relative">
        <div>
          <h1 className="font-display text-4xl md:text-5xl text-white font-bold tracking-tight mb-2">
            Build your Fresume.
          </h1>
          <p className="text-sm text-slate-400 max-w-2xl font-body leading-relaxed">
            Your active secure profile ledger session is initialized. Every metric remains human provenance validated and ATS audit-safe.
          </p>
        </div>
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-4 rounded-xl flex items-center gap-3 shadow-xl">
          <div className="w-9 h-9 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20 font-mono text-xs font-bold uppercase">
            {user.email?.[0]}
          </div>
          <div className="text-left">
            <span className="text-[9px] font-mono text-slate-500 uppercase block">Active Session</span>
            <span className="text-xs font-mono font-semibold text-slate-300 block">{user.email}</span>
          </div>
          <button
            onClick={handleSignOut}
            className="p-1.5 hover:text-rose-400 hover:bg-rose-500/5 text-slate-500 rounded-lg transition ml-2"
            title="Sign Out"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start z-10 relative">
        {/* Main Resume List */}
        <div className="md:col-span-2 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-white font-body">Your Resume Ledgers</h2>
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  if (hasActiveAccess) setShowImportModal(true);
                  else setShowPaywallModal(true);
                }}
                className="px-4 py-2 bg-slate-900/60 backdrop-blur-md text-slate-300 border border-slate-800 rounded-lg hover:bg-slate-800 transition-all flex items-center gap-2 font-mono text-xs cursor-pointer"
              >
                <Upload size={14} />
                <span>Import Text</span>
              </button>
              <button 
                onClick={() => {
                  if (hasActiveAccess) setShowCreateModal(true);
                  else setShowPaywallModal(true);
                }}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg hover:opacity-95 transition-all flex items-center gap-2 font-mono text-xs shadow-lg shadow-blue-500/10 cursor-pointer"
              >
                <Plus size={14} />
                <span>New Resume</span>
              </button>
            </div>
          </div>

          {resumes.length === 0 ? (
            <div className="p-12 border border-slate-800 border-dashed rounded-xl bg-slate-900/20 text-center">
              <FileText className="mx-auto text-slate-700 mb-4" size={48} />
              <p className="text-slate-400 font-mono text-xs mb-4">No resumes found. Create a new document to begin.</p>
              <button 
                onClick={() => {
                  if (hasActiveAccess) setShowCreateModal(true);
                  else setShowPaywallModal(true);
                }}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg hover:opacity-95 transition-all flex items-center gap-2 font-mono text-xs mx-auto cursor-pointer"
              >
                <Plus size={14} />
                <span>Create Fresh Ledger</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {resumes.map((resume) => {
                const score = resume.score_snapshot?.overallScore || 0;
                const isIndia = resume.resume_data.segment_fields.region === "India";
                
                return (
                  <Link 
                    href={`/resume/${resume.id}/fix`}
                    key={resume.id}
                    onClick={(e) => {
                      if (!hasActiveAccess) {
                        e.preventDefault();
                        setShowPaywallModal(true);
                      }
                    }}
                    className="group border border-slate-800 bg-slate-900/40 backdrop-blur-md p-6 rounded-xl transition-all flex justify-between items-center hover:border-blue-500/80 hover:bg-slate-900/60"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-center text-blue-400 group-hover:bg-blue-500/10 group-hover:border-blue-500/20 transition-all">
                        <FileText size={24} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-200 group-hover:text-blue-400 transition text-lg font-body">
                          {resume.title}
                        </h3>
                        <div className="flex flex-wrap gap-2.5 mt-1.5 font-mono text-[10px]">
                          <span className="px-2 py-0.5 bg-slate-950 border border-slate-800 rounded-md text-slate-400 uppercase tracking-wider">
                            {resume.resume_data.segment_fields.segment}
                          </span>
                          <span className="px-2 py-0.5 bg-slate-950 border border-slate-800 rounded-md text-slate-400">
                            {resume.resume_data.segment_fields.target_market === "india_campus" ? "India Campus" : isIndia ? "India General" : "International"}
                          </span>
                          <span className="text-slate-500 py-0.5">Updated {new Date(resume.updated_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <span className="text-[9px] font-mono text-slate-500 block">SCORE</span>
                        <span className={`font-mono font-bold text-2xl ${score >= 80 ? 'text-amber-400' : score >= 50 ? 'text-slate-300' : 'text-rose-400'}`}>
                          {score || "--"}
                        </span>
                      </div>
                      <button 
                        onClick={(e) => handleDelete(resume.id, e)}
                        className="p-2 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-rose-500/5 transition-all"
                        title="Delete Resume"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Informative Side Panel */}
        <div className="border border-slate-800/80 bg-slate-900/60 backdrop-blur-xl p-6 rounded-xl space-y-6 shadow-xl">
          {/* Razorpay Subscription Widget */}
          <div className="border-b border-slate-850 pb-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-display text-md font-bold text-white">Fresume Session Plan</h3>
              <span className={`px-2 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider font-bold border ${hasActiveAccess ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>
                {hasActiveAccess ? '★ ACTIVE SESSION' : 'NO ACTIVE SESSION'}
              </span>
            </div>

            {hasActiveAccess ? (
              <div className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-xl space-y-2 text-xs">
                <p className="text-amber-400 font-semibold flex items-center gap-1.5">
                  <span>✨ Single Session Active</span>
                </p>
                <p className="text-[11px] text-slate-400 leading-relaxed font-mono">
                  Your billing is fully managed on the Razorpay gateway. You can build, import, analyze, and generate your resume with unlimited changes during this session. Generating the final document will complete this session.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-400 font-body leading-relaxed">
                  Purchase a single session pass to unlock full access: upload, analyze, and generate your professional ATS-optimized resume.
                </p>
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-850 flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-white font-mono text-lg">₹20</span>
                    <span className="text-slate-500 text-[10px] font-mono"> / one-time pass</span>
                  </div>
                  <span className="text-[9px] font-mono text-blue-400 uppercase tracking-widest font-semibold bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded">
                    Pay-Per-Use
                  </span>
                </div>
                <button
                  onClick={handleUpgradeToPro}
                  disabled={upgrading}
                  className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg font-mono text-xs font-bold shadow-lg shadow-blue-500/10 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {upgrading ? "Processing..." : "Buy Session Pass"}
                  <Sparkles size={12} />
                </button>
              </div>
            )}

            {/* Recurring subscriptions coming soon */}
            <div className="pt-2 border-t border-slate-850">
              <span className="text-[9px] font-mono text-slate-500 block uppercase mb-1">Coming Soon</span>
              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                <div className="p-2 border border-slate-850 bg-slate-950/20 text-slate-500 rounded-lg flex items-center justify-between">
                  <span>Monthly Plan</span>
                  <span className="text-[8px] bg-slate-950 border border-slate-800 px-1 rounded">Locked</span>
                </div>
                <div className="p-2 border border-slate-850 bg-slate-950/20 text-slate-500 rounded-lg flex items-center justify-between">
                  <span>Yearly Plan</span>
                  <span className="text-[8px] bg-slate-950 border border-slate-800 px-1 rounded">Locked</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-display text-xl font-bold mb-3 text-white">Evidence Ledgers</h3>
            <p className="text-xs text-slate-400 font-mono leading-relaxed mb-6">
              Fresume maintains a strict audit ledger of resume modifications, protecting against AI hallucinated metrics to ensure immediate ATS compliance.
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="w-6 h-6 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full flex items-center justify-center text-xs font-mono">1</div>
              <div>
                <h4 className="text-xs font-semibold text-slate-200">AI Grounding Guard</h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">Generator rewrites verify that all achievements correspond directly to raw user experience.</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="w-6 h-6 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full flex items-center justify-center text-xs font-mono">2</div>
              <div>
                <h4 className="text-xs font-semibold text-slate-200">Chain-of-Custody</h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">Each bullet points back to human raw inputs, guaranteeing clean provenance ledger trails.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-6 h-6 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full flex items-center justify-center text-xs font-mono">3</div>
              <div>
                <h4 className="text-xs font-semibold text-slate-200">ATS Simulator</h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">Simulate a raw text scan to audit parseability indices before export compile.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PAYWALL MODAL */}
      {showPaywallModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-6 z-50 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-6 text-center">
            <div className="w-14 h-14 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full flex items-center justify-center mx-auto">
              <Sparkles size={28} />
            </div>
            <div className="space-y-2">
              <h3 className="font-display text-2xl font-bold text-white">Unlock Fresume Session</h3>
              <p className="text-xs text-slate-400 font-mono leading-relaxed">
                This workspace resides on the premium Supabase ledger layer. Activating a single session pass allows you to build, customize, and execute a full audit analysis.
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-1">
              <div className="flex justify-between items-center text-xs text-slate-400">
                <span>Single Pass Access</span>
                <span className="font-mono font-bold text-white">₹20</span>
              </div>
              <div className="text-[10px] text-left text-slate-500 font-mono leading-relaxed pt-1 border-t border-slate-850">
                * Permits unlimited edits & rewrites. Expired automatically upon generation of the final DOCX, PDF, or Plaintext download.
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button 
                onClick={handleUpgradeToPro}
                disabled={upgrading}
                className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg font-mono text-sm font-bold shadow-lg shadow-blue-500/15 transition-all"
              >
                {upgrading ? "Initializing Gateway..." : "Activate Session for ₹20"}
              </button>
              <button 
                onClick={() => setShowPaywallModal(false)}
                className="w-full py-2 text-xs text-slate-500 hover:text-slate-400 font-mono transition-all"
              >
                Cancel / Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-display text-2xl font-bold text-white">Create Resume Ledger</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1.5">Title / Persona</label>
                <input 
                  type="text" 
                  value={newTitle} 
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Aman Sharma - Full Stack Engineer" 
                  className="w-full px-3 py-2 bg-slate-950/50 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-sans"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1.5">Career Segment</label>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    type="button" 
                    onClick={() => { setSegment("professional"); setMarket("india_general"); }}
                    className={`py-2 px-3 border text-xs rounded-lg font-medium transition-all ${segment === "professional" ? "border-blue-500 bg-blue-500/10 text-blue-400" : "border-slate-800 text-slate-500 hover:text-slate-400"}`}
                  >
                    Professional
                  </button>
                  <button 
                    type="button" 
                    onClick={() => { setSegment("student"); setMarket("india_campus"); }}
                    className={`py-2 px-3 border text-xs rounded-lg font-medium transition-all ${segment === "student" ? "border-blue-500 bg-blue-500/10 text-blue-400" : "border-slate-800 text-slate-500 hover:text-slate-400"}`}
                  >
                    Student / Graduate
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1.5">Target Market</label>
                <select 
                  value={market} 
                  onChange={(e) => setMarket(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950/50 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-sans"
                >
                  {segment === "student" ? (
                    <>
                      <option value="india_campus" className="bg-slate-900 text-white">India Campus Recruitment (CGPA + Board Marks)</option>
                      <option value="international" className="bg-slate-900 text-white">International / General Student</option>
                    </>
                  ) : (
                    <>
                      <option value="india_general" className="bg-slate-900 text-white">India General Corporate</option>
                      <option value="international" className="bg-slate-900 text-white">International / US / European (No Photo, strictly standard)</option>
                    </>
                  )}
                </select>
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs text-slate-500 hover:text-slate-400 font-mono"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 text-xs bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg hover:opacity-95 transition-all font-mono flex items-center gap-2 shadow-lg shadow-blue-500/15"
                >
                  <span>Build Ledger</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IMPORT TEXT MODAL */}
      {showImportModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-display text-2xl font-bold text-white">Import Resume Text</h3>
            <p className="text-xs text-slate-400 font-mono">Paste the raw copy-paste content from your PDF/DOCX below. Fresume will utilize server-side Gemini to cleanly parse it into canonical schema.</p>
            <form onSubmit={handleImportText} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1.5">Raw Text Copy</label>
                <textarea 
                  value={importText} 
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="Paste raw text here..." 
                  className="w-full h-48 px-3 py-2 bg-slate-950/50 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500 font-mono transition-all"
                  required
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 text-xs text-slate-500 hover:text-slate-400 font-mono"
                  disabled={importing}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 text-xs bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg hover:opacity-95 transition-all font-mono flex items-center gap-2 shadow-lg shadow-blue-500/15"
                  disabled={importing}
                >
                  {importing ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                      <span>Parsing with Gemini...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      <span>Extract & Parse</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
