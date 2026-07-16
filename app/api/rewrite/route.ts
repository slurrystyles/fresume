import { NextResponse } from "next/server";
import { rewriteBullet } from "../../../lib/gemini";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { bulletText, context } = body;

    if (!bulletText) {
      return NextResponse.json(
        { success: false, error: "Bullet text is required for rewrite optimization." },
        { status: 400 }
      );
    }

    const rewriteResponse = await rewriteBullet(bulletText, context || "");

    return NextResponse.json({
      success: true,
      rewrittenText: rewriteResponse.rewrittenText,
      rejectionHappened: rewriteResponse.rejectionHappened,
      explanation: rewriteResponse.explanation,
      suggestedNumbers: rewriteResponse.suggestedNumbers
    });
  } catch (err: any) {
    console.error("API rewrite error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to generate bullet rewrite." },
      { status: 500 }
    );
  }
}
