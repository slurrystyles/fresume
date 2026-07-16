import { NextResponse } from "next/server";
import htmlPdf from "html-pdf-node";
import { PDFParse } from "pdf-parse";

export async function POST(request: Request) {
  try {
    const { html, resumeData } = await request.json();

    if (!html || !resumeData) {
      return NextResponse.json(
        { success: false, error: "Both HTML template and source resume data are required for verification." },
        { status: 400 }
      );
    }

    // 1. Render HTML to actual PDF Buffer using html-pdf-node (Puppeteer)
    const options = { 
      format: 'Letter',
      margin: {
        top: '0.75in',
        right: '0.75in',
        bottom: '0.75in',
        left: '0.75in'
      }
    };
    const file = { content: html };

    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await htmlPdf.generatePdf(file, options);
    } catch (renderErr: any) {
      console.error("html-pdf-node rendering error:", renderErr);
      return NextResponse.json({
        success: false,
        error: `PDF Rendering failed: ${renderErr.message || renderErr}`
      }, { status: 500 });
    }

    // 2. Extract raw text from the actually-rendered PDF buffer using pdf-parse
    let extractedText = "";
    try {
      const parser = new PDFParse({ data: pdfBuffer });
      const parsed = await parser.getText();
      extractedText = parsed.text || "";
      await parser.destroy();
    } catch (parseErr: any) {
      console.error("pdf-parse extraction error:", parseErr);
      return NextResponse.json({
        success: false,
        error: `PDF Extraction failed: ${parseErr.message || parseErr}`
      }, { status: 500 });
    }

    const rawText = extractedText.replace(/\s+/g, ' ').trim();

    const missingFields: string[] = [];
    const matchedFields: string[] = [];

    // Diff essential items to verify ATS discovery rate from the actual extracted text
    const name = resumeData.contact.name;
    if (name && rawText.toLowerCase().includes(name.toLowerCase())) {
      matchedFields.push("Full Name");
    } else if (name) {
      missingFields.push("Full Name");
    }

    const email = resumeData.contact.email;
    if (email && rawText.toLowerCase().includes(email.toLowerCase())) {
      matchedFields.push("Email");
    } else if (email) {
      missingFields.push("Email");
    }

    const phone = resumeData.contact.phone;
    if (phone && rawText.toLowerCase().includes(phone.toLowerCase())) {
      matchedFields.push("Phone");
    } else if (phone) {
      missingFields.push("Phone");
    }

    // Verify experience bullet text exists uncorrupted in the extracted text
    let bulletTotal = 0;
    let bulletMatched = 0;

    if (resumeData.experience && resumeData.experience.length > 0) {
      resumeData.experience.forEach((exp: any) => {
        if (exp.bullets && exp.bullets.length > 0) {
          exp.bullets.forEach((b: any) => {
            bulletTotal++;
            // Get first few words of bullet to check if present consecutively
            const firstFewWords = b.text.split(' ').slice(0, 4).join(' ');
            if (rawText.toLowerCase().includes(firstFewWords.toLowerCase())) {
              bulletMatched++;
            }
          });
        }
      });
    }

    const bulletMatchRate = bulletTotal > 0 ? (bulletMatched / bulletTotal) : 1;
    const isAtsReady = missingFields.length === 0 && bulletMatchRate >= 0.85;

    return NextResponse.json({
      success: true,
      isAtsReady,
      extractedCharacterCount: rawText.length,
      matchedFields,
      missingFields,
      bulletMatchRate: Math.round(bulletMatchRate * 100),
      rawTextSample: rawText.substring(0, 400) + "..."
    });

  } catch (err: any) {
    console.error("Parseability check error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to complete parseability proof." },
      { status: 500 }
    );
  }
}
