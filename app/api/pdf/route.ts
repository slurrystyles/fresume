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

    // Server-side check of active one-time access subscription
    if (supabase && resumeId && userId) {
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

    // Auto-expire subscription on successful generation
    if (supabase && userId) {
      await supabase.from("subscriptions").update({ status: "expired" }).eq("user_id", userId);
    }

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
