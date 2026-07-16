import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
const html_pdf = require("html-pdf-node");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

export async function POST(request: Request) {
  try {
    const { html, title, resumeId, userId } = await request.json();

    if (!html) {
      return NextResponse.json(
        { success: false, error: "HTML content is required for PDF rendering." },
        { status: 400 }
      );
    }

    // Server-side check of export limits for non-premium (Free) tier
    if (supabase && resumeId && userId) {
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

    // Configure PDF options
    const options = {
      format: "A4",
      margin: {
        top: "20px",
        bottom: "20px",
        left: "20px",
        right: "20px"
      },
      printBackground: true
    };

    const file = { content: html };

    // Create a Promise wrapper around html-pdf-node's generatePdf to handle it in async/await
    const generatePdfBuffer = (): Promise<Buffer> => {
      return new Promise((resolve, reject) => {
        html_pdf.generatePdf(file, options, (err: any, buffer: Buffer) => {
          if (err) reject(err);
          else resolve(buffer);
        });
      });
    };

    try {
      const pdfBuffer = await generatePdfBuffer();
      
      return new Response(pdfBuffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${title || "resume"}.pdf"`
        }
      });
    } catch (nodeErr: any) {
      console.warn("html-pdf-node failed (likely due to missing sandbox Chromium dependencies). Falling back to printable HTML document...", nodeErr);
      
      // Fallback: Return raw styled html so the browser can natively trigger print preview!
      return new Response(html, {
        headers: {
          "Content-Type": "text/html",
          "Content-Disposition": "inline"
        }
      });
    }

  } catch (err: any) {
    console.error("PDF api error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to render PDF." },
      { status: 500 }
    );
  }
}
