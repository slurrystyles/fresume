import { NextResponse } from "next/server";
import { headers } from "next/headers";
import crypto from "crypto";
import { supabase } from "../../../lib/supabase";
import { rewriteBullet } from "../../../lib/gemini";

export const dynamic = "force-dynamic";

function sanitizeInput(text: string): string {
  return text.replace(/<[^>]*>/g, "").trim();
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const rawBullet = body.bulletText || body.text || "";

    // 1. Input Constraints & Sanitization
    const sanitized = sanitizeInput(rawBullet);
    if (!sanitized) {
      return NextResponse.json(
        { success: false, error: "Bullet text cannot be empty or contain only whitespace/HTML tags." },
        { status: 400 }
      );
    }
    if (sanitized.length > 280) {
      return NextResponse.json(
        { success: false, error: "Bullet text exceeds the maximum limit of 280 characters." },
        { status: 400 }
      );
    }

    // 2. IP-Based Rate Limiting using Supabase
    if (!supabase) {
      console.warn("Supabase client is not available. Proceeding without rate limiting.");
    } else {
      const headerList = await headers();
      const rawIp = (headerList.get("x-forwarded-for") || "127.0.0.1").split(",")[0].trim();
      const ipHash = crypto.createHash("sha256").update(rawIp).digest("hex");

      const { data: record, error: selectError } = await supabase
        .from("demo_rate_limits")
        .select("*")
        .eq("ip_hash", ipHash)
        .maybeSingle();

      if (selectError) {
        console.error("Failed to fetch rate limit record:", selectError.message);
      }

      const now = new Date();

      if (record) {
        const windowStart = new Date(record.window_start);
        const diffMs = now.getTime() - windowStart.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);

        if (diffHours > 1) {
          // Reset window
          const { error: updateError } = await supabase
            .from("demo_rate_limits")
            .update({
              request_count: 1,
              window_start: now.toISOString()
            })
            .eq("ip_hash", ipHash);
          if (updateError) console.error("Failed to reset rate limit:", updateError.message);
        } else {
          if (record.request_count >= 5) {
            return NextResponse.json(
              { success: false, error: "You've hit the demo limit — sign up free to keep going." },
              { status: 429 }
            );
          } else {
            // Increment request count
            const { error: updateError } = await supabase
              .from("demo_rate_limits")
              .update({
                request_count: record.request_count + 1
              })
              .eq("ip_hash", ipHash);
            if (updateError) console.error("Failed to increment rate limit:", updateError.message);
          }
        }
      } else {
        // Insert new limit record
        const { error: insertError } = await supabase
          .from("demo_rate_limits")
          .insert({
            ip_hash: ipHash,
            request_count: 1,
            window_start: now.toISOString()
          });
        if (insertError) console.error("Failed to insert rate limit:", insertError.message);
      }
    }

    // 3. Call Grounded AI Rewrite logic
    const rewriteResponse = await rewriteBullet(sanitized, "");

    // 4. Response Shape matching instructions
    if (rewriteResponse.rejectionHappened) {
      return NextResponse.json({
        success: true,
        rewritten: rewriteResponse.rewrittenText,
        grounded: false,
        note: "No metric was provided, so we didn't invent one — this is exactly what would happen with your real resume too."
      });
    }

    return NextResponse.json({
      success: true,
      rewritten: rewriteResponse.rewrittenText,
      grounded: true
    });
  } catch (err: any) {
    console.error("API demo rewrite error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to process demo rewrite." },
      { status: 500 }
    );
  }
}
