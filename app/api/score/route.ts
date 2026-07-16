import { NextResponse } from "next/server";
import { scoreResume } from "../../../lib/gemini";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { resumeData, jdText } = body;

    if (!resumeData) {
      return NextResponse.json(
        { success: false, error: "ResumeData object is required to compute scores." },
        { status: 400 }
      );
    }

    const scoring = await scoreResume(resumeData, jdText);

    return NextResponse.json({ success: true, scoring });
  } catch (err: any) {
    console.error("API score error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to compute scoring snapshot." },
      { status: 500 }
    );
  }
}
