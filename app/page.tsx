"use client";

import React, { useState, useEffect } from "react";
import { Database, supabase } from "../lib/supabase";
import { Resume } from "../lib/schema";
import { Plus, Trash2, ArrowRight, FileText, Sparkles, Upload, LogOut, Key, Mail, ShieldAlert } from "lucide-react";
import Link from "next/link";

export default function Dashboard() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  
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

  // Check user session
  useEffect(() => {
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
      <div className="max-w-md mx-auto my-20 p-8 border border-line bg-surface rounded-lg shadow-md text-center">
        <ShieldAlert className="mx-auto text-caution mb-4" size={48} />
        <h2 className="font-display text-xl font-bold mb-2">Supabase Missing</h2>
        <p className="text-sm text-ink/70 font-mono mb-6">
          NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be configured in settings to use the database layer.
        </p>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12">
        <div className="animate-spin text-signal text-2xl">●</div>
        <p className="text-xs font-mono text-ink/50 mt-2">Checking session status...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-paper/50">
        <div className="max-w-md w-full bg-surface border border-line rounded-xl shadow-xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="font-display text-3xl font-bold tracking-tight text-ink">Groundwork</h1>
            <p className="text-xs font-mono text-evidence uppercase tracking-widest font-semibold">
              Truth-Grounded AI Resume Ledger
            </p>
          </div>

          <div className="flex border-b border-line">
            <button
              onClick={() => { setAuthMode("signin"); setAuthError(null); }}
              className={`flex-1 pb-3 text-sm font-mono transition ${authMode === "signin" ? "border-b-2 border-signal text-signal font-semibold" : "text-ink/60"}`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setAuthMode("signup"); setAuthError(null); }}
              className={`flex-1 pb-3 text-sm font-mono transition ${authMode === "signup" ? "border-b-2 border-signal text-signal font-semibold" : "text-ink/60"}`}
            >
              Create Account
            </button>
          </div>

          {authError && (
            <div className="p-3 bg-caution/10 border border-caution/20 rounded text-xs text-caution font-mono leading-relaxed">
              {authError}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-[10px] font-mono uppercase text-ink/50">Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-ink/40">
                  <Mail size={14} />
                </span>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-line rounded-md text-sm focus:outline-none focus:border-signal font-sans bg-paper/50"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-mono uppercase text-ink/50">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-ink/40">
                  <Key size={14} />
                </span>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-line rounded-md text-sm focus:outline-none focus:border-signal font-sans bg-paper/50"
                />
              </div>
            </div>

            {authMode === "signup" && (
              <>
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono uppercase text-ink/50">Career Segment</label>
                  <select
                    value={signupSegment}
                    onChange={(e) => setSignupSegment(e.target.value as "student" | "professional")}
                    className="w-full px-3 py-2 border border-line rounded-md text-sm focus:outline-none focus:border-signal font-sans bg-paper/50 text-ink"
                  >
                    <option value="professional">Professional (Experienced)</option>
                    <option value="student">Student (Campus/Fresher)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-mono uppercase text-ink/50">Target Region</label>
                  <select
                    value={signupRegion}
                    onChange={(e) => setSignupRegion(e.target.value)}
                    className="w-full px-3 py-2 border border-line rounded-md text-sm focus:outline-none focus:border-signal font-sans bg-paper/50 text-ink"
                  >
                    <option value="India">India</option>
                    <option value="USA">United States</option>
                    <option value="Europe">Europe</option>
                    <option value="Other">Other / International</option>
                  </select>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={authSubmitting}
              className="w-full py-2.5 bg-signal hover:opacity-90 text-white rounded-md font-mono text-sm transition flex items-center justify-center gap-2"
            >
              {authSubmitting ? "Authenticating..." : authMode === "signup" ? "Sign Up & Start" : "Authenticate"}
              <ArrowRight size={14} />
            </button>
          </form>

          <p className="text-[10px] text-ink/40 font-mono text-center">
            Secured via Supabase authentication. Your resume ledger is strictly private to your account.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto w-full px-6 py-12 flex-1 flex flex-col justify-start">
      {/* Hero / Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 border-b border-line pb-8">
        <div>
          <h1 className="font-display text-display-lg text-ink font-bold tracking-tight mb-2">
            Lay the Groundwork.
          </h1>
          <p className="text-body text-ink/75 max-w-2xl font-body">
            Your active secure profile ledger session is initialized. Every metric remains human provenance validated and ATS audit-safe.
          </p>
        </div>
        <div className="bg-surface border border-line p-4 rounded-lg flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-signal/10 text-signal flex items-center justify-center font-mono text-xs font-bold uppercase">
            {user.email?.[0]}
          </div>
          <div className="text-left">
            <span className="text-[10px] font-mono text-ink/40 uppercase block">Active Session</span>
            <span className="text-xs font-mono font-semibold text-ink/80 block">{user.email}</span>
          </div>
          <button
            onClick={handleSignOut}
            className="p-1.5 hover:text-caution hover:bg-caution/5 text-ink/50 rounded transition ml-2"
            title="Sign Out"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        {/* Main Resume List */}
        <div className="md:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-heading font-semibold text-ink font-body">Your Resume Ledgers</h2>
            <div className="flex gap-2">
              <button 
                onClick={() => setShowImportModal(true)}
                className="px-4 py-2 bg-paper text-ink border border-line rounded-md hover:bg-line transition flex items-center gap-2 font-mono text-sm"
              >
                <Upload size={14} />
                <span>Import Text</span>
              </button>
              <button 
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-signal text-white rounded-md hover:opacity-90 transition flex items-center gap-2 font-mono text-sm"
              >
                <Plus size={14} />
                <span>New Resume</span>
              </button>
            </div>
          </div>

          {resumes.length === 0 ? (
            <div className="p-12 border border-line border-dashed rounded-lg bg-surface text-center">
              <FileText className="mx-auto text-line mb-4" size={48} />
              <p className="text-ink/60 font-mono text-sm mb-4">No resumes found. Create a new document to begin.</p>
              <button 
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-signal text-white rounded-md hover:opacity-90 transition flex items-center gap-2 font-mono text-sm mx-auto"
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
                    className="group border border-line hover:border-signal bg-surface p-6 rounded-lg transition-all flex justify-between items-center"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-paper rounded flex items-center justify-center text-signal group-hover:bg-signal/10 transition">
                        <FileText size={24} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-ink group-hover:text-signal transition text-lg font-body">
                          {resume.title}
                        </h3>
                        <div className="flex gap-3 mt-1 font-mono text-xs text-ink/60">
                          <span className="px-1.5 py-0.5 bg-paper rounded uppercase tracking-wider">
                            {resume.resume_data.segment_fields.segment}
                          </span>
                          <span className="px-1.5 py-0.5 bg-paper rounded">
                            {resume.resume_data.segment_fields.target_market === "india_campus" ? "India Campus" : isIndia ? "India General" : "International"}
                          </span>
                          <span>Updated {new Date(resume.updated_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <span className="text-xs font-mono text-ink/40 block">SCORE</span>
                        <span className={`font-mono font-bold text-2xl ${score >= 80 ? 'text-evidence' : score >= 50 ? 'text-ink/80' : 'text-caution'}`}>
                          {score || "--"}
                        </span>
                      </div>
                      <button 
                        onClick={(e) => handleDelete(resume.id, e)}
                        className="p-2 text-ink/40 hover:text-caution rounded hover:bg-caution/5 transition"
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
        <div className="border border-line bg-surface p-6 rounded-lg space-y-6">
          {/* Razorpay Subscription Widget */}
          <div className="border-b border-line pb-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-display text-md font-bold text-ink">Premium Ledger Plan</h3>
              <span className={`px-2 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider font-bold ${subscription?.tier === 'pro' ? 'bg-evidence/20 text-evidence' : 'bg-ink/10 text-ink/70'}`}>
                {subscription?.tier === 'pro' ? '★ PRO ACTIVE' : 'FREE PLAN'}
              </span>
            </div>

            {subscription?.tier === 'pro' ? (
              <div className="bg-evidence/5 border border-evidence/20 p-4 rounded space-y-2 text-xs font-body">
                <p className="text-ink/80 font-semibold flex items-center gap-1">
                  <span>✨ Premium Plan Active</span>
                </p>
                <p className="text-[11px] text-ink/60 leading-relaxed font-mono">
                  Your billing is fully managed on the India-First Razorpay gateway. Premium features like advanced multi-segment templates, export tracking, and Gemini verification are unlocked.
                </p>
                {subscription.ends_at && (
                  <p className="text-[10px] text-ink/40 font-mono mt-1">
                    Valid till: {new Date(subscription.ends_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-ink/70 font-body leading-relaxed">
                  Upgrade to unlock the full potential of Groundwork: unlimited AI ledger checks, full 8 ATS-optimized print templates, and unlimited DOCX exports.
                </p>
                <div className="bg-paper/40 p-3 rounded border border-line flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-ink font-mono text-sm">₹1,499</span>
                    <span className="text-ink/50 text-[10px] font-mono"> / year</span>
                  </div>
                  <span className="text-[10px] font-mono text-evidence uppercase tracking-widest font-semibold bg-evidence/10 px-1.5 py-0.5 rounded">
                    India First
                  </span>
                </div>
                <button
                  onClick={handleUpgradeToPro}
                  disabled={upgrading}
                  className="w-full py-2 bg-signal hover:opacity-95 text-white rounded font-mono text-xs font-bold transition flex items-center justify-center gap-1.5"
                >
                  {upgrading ? "Processing upgrade..." : "Upgrade with Razorpay"}
                  <Sparkles size={12} />
                </button>
              </div>
            )}
          </div>

          <div>
            <h3 className="font-display text-xl font-bold mb-4 text-ink">Evidence Ledgers</h3>
            <p className="text-xs text-ink/70 font-mono leading-relaxed mb-6">
              In standard resumes, metrics are often fabricated or exaggerated. Groundwork combats this by maintaining a strict, non-repudiable audit ledger of modifications.
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="w-6 h-6 bg-evidence/10 text-evidence rounded-full flex items-center justify-center text-xs font-mono">1</div>
              <div>
                <h4 className="text-sm font-semibold text-ink">AI Grounding Guard</h4>
                <p className="text-xs text-ink/60 mt-0.5">The rewrite generator rejects metrics not grounded in user input.</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="w-6 h-6 bg-evidence/10 text-evidence rounded-full flex items-center justify-center text-xs font-mono">2</div>
              <div>
                <h4 className="text-sm font-semibold text-ink">Chain-of-Custody</h4>
                <p className="text-xs text-ink/60 mt-0.5">Every bullet carries an immutable stamp showing user provenance.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-6 h-6 bg-evidence/10 text-evidence rounded-full flex items-center justify-center text-xs font-mono">3</div>
              <div>
                <h4 className="text-sm font-semibold text-ink">ATS simulation</h4>
                <p className="text-xs text-ink/60 mt-0.5">Test real parseability using a simulated plain text extractor.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div className="bg-surface border border-line rounded-lg max-w-md w-full p-6 shadow-xl">
            <h3 className="font-display text-2xl font-bold mb-4">Create Resume Ledger</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-ink/60 mb-1">Title / Persona</label>
                <input 
                  type="text" 
                  value={newTitle} 
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Aman Sharma - Full Stack Engineer" 
                  className="w-full px-3 py-2 border border-line rounded-md text-sm focus:outline-none focus:border-signal"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-ink/60 mb-1">Career Segment</label>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    type="button" 
                    onClick={() => { setSegment("professional"); setMarket("india_general"); }}
                    className={`py-2 px-3 border text-sm rounded-md font-medium transition ${segment === "professional" ? "border-signal bg-signal/5 text-signal" : "border-line text-ink/60"}`}
                  >
                    Professional
                  </button>
                  <button 
                    type="button" 
                    onClick={() => { setSegment("student"); setMarket("india_campus"); }}
                    className={`py-2 px-3 border text-sm rounded-md font-medium transition ${segment === "student" ? "border-signal bg-signal/5 text-signal" : "border-line text-ink/60"}`}
                  >
                    Student / Graduate
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-ink/60 mb-1">Target Market</label>
                <select 
                  value={market} 
                  onChange={(e) => setMarket(e.target.value as any)}
                  className="w-full px-3 py-2 border border-line rounded-md text-sm focus:outline-none focus:border-signal"
                >
                  {segment === "student" ? (
                    <>
                      <option value="india_campus">India Campus Recruitment (CGPA + Board Marks)</option>
                      <option value="international">International / General Student</option>
                    </>
                  ) : (
                    <>
                      <option value="india_general">India General Corporate</option>
                      <option value="international">International / US / European (No Photo, strictly standard)</option>
                    </>
                  )}
                </select>
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm text-ink/60 hover:text-ink font-mono"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 text-sm bg-signal text-white rounded-md hover:opacity-90 transition font-mono flex items-center gap-2"
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
        <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div className="bg-surface border border-line rounded-lg max-w-lg w-full p-6 shadow-xl">
            <h3 className="font-display text-2xl font-bold mb-2">Import Resume Text</h3>
            <p className="text-xs text-ink/60 font-mono mb-4">Paste the raw copy-paste content from your PDF/DOCX below. Groundwork will utilize server-side Gemini to cleanly parse it into canonical schema.</p>
            <form onSubmit={handleImportText} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-ink/60 mb-1">Raw Text Copy</label>
                <textarea 
                  value={importText} 
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="Paste raw text here..." 
                  className="w-full h-48 px-3 py-2 border border-line rounded-md text-sm focus:outline-none focus:border-signal font-mono text-xs"
                  required
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 text-sm text-ink/60 hover:text-ink font-mono"
                  disabled={importing}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 text-sm bg-signal text-white rounded-md hover:opacity-90 transition font-mono flex items-center gap-2"
                  disabled={importing}
                >
                  {importing ? (
                    <>
                      <span className="animate-spin text-white">●</span>
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
