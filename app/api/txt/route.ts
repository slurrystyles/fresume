import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

export async function POST(request: Request) {
  try {
    const { resumeId, userId } = await request.json();

    if (!resumeId || !userId) {
      return NextResponse.json(
        { success: false, error: "Missing required parameter: resumeId or userId." },
        { status: 400 }
      );
    }

    // Server-side check of export limits for non-premium (Free) tier
    if (supabase) {
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      const isPro = subscription?.tier === "pro" && subscription?.status === "active" && (
        !subscription.ends_at || new Date(subscription.ends_at) > new Date()
      );

      if (!isPro) {
        // Find user's resumes
        const { data: userResumes } = await supabase
          .from('resumes')
          .select('id')
          .eq('user_id', userId);

        const resumeIds = userResumes?.map((r: any) => r.id) || [resumeId];

        // Count downloads for this month (Free limit: 3)
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

        const { count } = await supabase
          .from('exports')
          .select('*', { count: 'exact', head: true })
          .in('resume_id', resumeIds)
          .gte('created_at', startOfMonth);

        if (count !== null && count >= 3) {
          return NextResponse.json(
            { 
              success: false, 
              error: "Monthly free export limit exceeded (3 / month). Please upgrade to the Pro Ledger Plan for unlimited exports.",
              limitExceeded: true
            },
            { status: 403 }
          );
        }
      }
    }

    return NextResponse.json({ success: true, message: "Export limit check passed." });

  } catch (err: any) {
    console.error("TXT Limit check route error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to verify export limits." },
      { status: 500 }
    );
  }
}
