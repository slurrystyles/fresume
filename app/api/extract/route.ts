import { NextResponse } from "next/server";
import { extractResume } from "../../../lib/gemini";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { text } = body;

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { success: false, error: "Raw resume text is required." },
        { status: 400 }
      );
    }

    const structuredData = await extractResume(text);

    // Build a fresh resume object with Version 1
    const newResume = {
      id: "resume_" + Math.random().toString(36).substr(2, 9),
      user_id: "demo-user",
      title: structuredData.contact.name ? `${structuredData.contact.name} - Extracted Resume` : "Extracted Resume",
      status: "draft" as const,
      source_type: "upload" as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      resume_data: structuredData,
    };

    return NextResponse.json({ success: true, resume: newResume });
  } catch (err: any) {
    console.error("API extract error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to extract resume text." },
      { status: 500 }
    );
  }
}
