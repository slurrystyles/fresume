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

    // Server-side check of active one-time access subscription
    if (supabase) {
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      const isPro = subscription?.tier === "pro" && subscription?.status === "active";

      if (!isPro) {
        return NextResponse.json(
          { 
            success: false, 
            error: "Payment required: You need to pay ₹20 for one-time access to export this resume.",
            limitExceeded: true
          },
          { status: 403 }
        );
      }

      // Auto-expire subscription on successful export check
      await supabase.from("subscriptions").update({ status: "expired" }).eq("user_id", userId);
    }

    return NextResponse.json({ success: true, message: "Export limit check passed and token consumed." });

  } catch (err: any) {
    console.error("TXT Limit check route error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to verify export limits." },
      { status: 500 }
    );
  }
}
