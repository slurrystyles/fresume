import { GoogleGenAI, Type } from "@google/genai";
import { ResumeData, Finding, ScoreSnapshot, Bullet } from "./schema";
import { WEAK_OPENERS } from "./scoring/verb-lists";
import { RUBRIC_WEIGHTS } from "./scoring/weights";

// Initialize Gemini on the server side
const apiKey = process.env.GEMINI_API_KEY;
export const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    })
  : null;

// Helper to extract numbers/percentages from text for the anti-hallucination guard
export function extractNumbers(text: string): string[] {
  // Matches digits, percentages, currency, e.g. "35%", "$10k", "4.2MB", "12", "1,200"
  const regex = /\b\d+(?:[.,]\d+)?%?|\$\d+(?:[.,]\d+)?[kK]?[mM]?/g;
  const matches = text.match(regex) || [];
  return matches.map(m => m.toLowerCase());
}

/**
 * PATH 1 GROUNDING GUARD: Real-time number-diff rejection filter
 * Validates that an AI-rewritten bullet does NOT contain any fabricated numbers.
 * Reject the AI response server-side if it introduces a number/percentage not present in input.
 */
export function validateGroundedNumbers(originalText: string, rewrittenText: string): boolean {
  const originalNumbers = extractNumbers(originalText);
  const rewrittenNumbers = extractNumbers(rewrittenText);
  
  // Check if there are any new numbers in the rewrite that weren't in the original text
  for (const num of rewrittenNumbers) {
    if (!originalNumbers.includes(num)) {
      return false; // Rejected! Found a fabricated number!
    }
  }
  return true;
}

/**
 * PROMPT 10/CHAIN-OF-CUSTODY AUDIT:
 * Walks every bullet's source_note chain back to human origins (e.g., "user-provided", "voice-transcript", "user-edited-manual").
 * Flags any bullet where the chain is purely AI-sourced or missing proper lineage.
 */
export { auditChainOfCustody } from "./audit";
export type { AuditResult } from "./audit";

/**
 * 1. EXTRACTION ENGINE: Extract unstructured text into the canonical ResumeData structure
 */
export async function extractResume(rawText: string): Promise<ResumeData> {
  const defaultResume: ResumeData = {
    contact: { name: "Aman Sharma", email: "aman@example.com", phone: "9876543210", location: "Bengaluru" },
    summary: "Professional Software Developer.",
    education: [],
    experience: [],
    projects: [],
    skills: { technical: [], tools: [], soft: [] },
    certifications: [],
    achievements: [],
    segment_fields: { segment: "professional", region: "India", photo_required: false, include_marks_10_12: false },
    meta: { version_number: 1, last_scored_at: new Date().toISOString() }
  };

  if (!ai) {
    console.log("No GEMINI_API_KEY config. Returning simulated extracted data.");
    return defaultResume;
  }

  try {
    const prompt = `You are a strict, professional ATS resume extraction system.
Extract details from the following resume text into a single valid JSON object matching the requested schema.

Guidelines:
- Leave fields null or empty array if they are not explicitly present in the text.
- Set "source_note" = "user-provided" on every single extracted experience or project bullet.
- Do not make up or infer any dates, metrics, or technologies.
- Format CGPA as 'X/10' or marks as 'X%' if present.

Resume raw text:
"""
${rawText}
"""`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            contact: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                email: { type: Type.STRING },
                phone: { type: Type.STRING },
                location: { type: Type.STRING },
                linkedin_url: { type: Type.STRING },
                github_url: { type: Type.STRING },
                portfolio_url: { type: Type.STRING }
              },
              required: ["name", "email", "phone", "location"]
            },
            summary: { type: Type.STRING },
            education: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  degree: { type: Type.STRING },
                  institution: { type: Type.STRING },
                  location: { type: Type.STRING },
                  start_date: { type: Type.STRING },
                  end_date: { type: Type.STRING },
                  cgpa_or_percentage: { type: Type.STRING },
                  board_x: { type: Type.STRING },
                  board_xii: { type: Type.STRING },
                  is_current: { type: Type.BOOLEAN }
                },
                required: ["degree", "institution", "location", "start_date", "end_date", "cgpa_or_percentage", "is_current"]
              }
            },
            experience: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  org: { type: Type.STRING },
                  location: { type: Type.STRING },
                  start_date: { type: Type.STRING },
                  end_date: { type: Type.STRING },
                  is_current: { type: Type.BOOLEAN },
                  bullets: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        text: { type: Type.STRING },
                        has_metric: { type: Type.BOOLEAN },
                        source_note: { type: Type.STRING }
                      },
                      required: ["id", "text", "has_metric", "source_note"]
                    }
                  }
                },
                required: ["title", "org", "location", "start_date", "end_date", "is_current", "bullets"]
              }
            },
            projects: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  tech_stack: { type: Type.ARRAY, items: { type: Type.STRING } },
                  role: { type: Type.STRING },
                  start_date: { type: Type.STRING },
                  end_date: { type: Type.STRING },
                  bullets: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        text: { type: Type.STRING },
                        has_metric: { type: Type.BOOLEAN },
                        source_note: { type: Type.STRING }
                      },
                      required: ["id", "text", "has_metric", "source_note"]
                    }
                  }
                },
                required: ["title", "tech_stack", "role", "start_date", "end_date", "bullets"]
              }
            },
            skills: {
              type: Type.OBJECT,
              properties: {
                technical: { type: Type.ARRAY, items: { type: Type.STRING } },
                tools: { type: Type.ARRAY, items: { type: Type.STRING } },
                soft: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["technical", "tools", "soft"]
            },
            certifications: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  issuer: { type: Type.STRING },
                  date: { type: Type.STRING },
                  credential_url: { type: Type.STRING }
                },
                required: ["name", "issuer", "date"]
              }
            },
            achievements: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING },
                  has_metric: { type: Type.BOOLEAN }
                },
                required: ["text", "has_metric"]
              }
            },
            segment_fields: {
              type: Type.OBJECT,
              properties: {
                segment: { type: Type.STRING, description: "Must be 'student' or 'professional'" },
                region: { type: Type.STRING },
                photo_required: { type: Type.BOOLEAN },
                include_marks_10_12: { type: Type.BOOLEAN }
              },
              required: ["segment", "region", "photo_required", "include_marks_10_12"]
            }
          },
          required: ["contact", "summary", "education", "experience", "projects", "skills", "certifications", "achievements", "segment_fields"]
        }
      }
    });

    const parsed = JSON.parse(response.text || "{}") as ResumeData;
    parsed.meta = { version_number: 1, last_scored_at: new Date().toISOString() };
    
    // Auto-patch IDs and source_notes if Gemini missed them
    parsed.experience.forEach((exp, idx) => {
      exp.bullets.forEach((b, bIdx) => {
        b.id = b.id || `bullet-exp-${idx}-${bIdx}`;
        b.source_note = "user-provided";
      });
    });
    parsed.projects.forEach((proj, idx) => {
      proj.bullets.forEach((b, bIdx) => {
        b.id = b.id || `bullet-proj-${idx}-${bIdx}`;
        b.source_note = "user-provided";
      });
    });

    return parsed;
  } catch (err) {
    console.error("Gemini extraction failed, returning default template:", err);
    return defaultResume;
  }
}

/**
 * 2. COMPREHENSIVE SCORING ENGINE (6 RUBRIC CATEGORIES)
 */
export async function scoreResume(resumeData: ResumeData, jdText?: string): Promise<ScoreSnapshot> {
  const findings: Finding[] = [];
  
  // A. Format Parseability (0-100)
  // Non-AI, rule-based check
  let formatScore = 100;
  if (!resumeData.contact.phone) {
    formatScore -= 15;
    findings.push({
      id: "fmt-phone",
      category: "format",
      severity: "high",
      message: "Missing phone number. ATS parsers need contact info prominently located.",
      target_field_path: "contact.phone",
      status: "open"
    });
  }
  if (!resumeData.contact.email) {
    formatScore -= 20;
    findings.push({
      id: "fmt-email",
      category: "format",
      severity: "high",
      message: "Missing email address. ATS parsers will reject this resume immediately.",
      target_field_path: "contact.email",
      status: "open"
    });
  }
  if (resumeData.contact.linkedin_url && !resumeData.contact.linkedin_url.includes("linkedin.com")) {
    formatScore -= 5;
    findings.push({
      id: "fmt-linkedin",
      category: "format",
      severity: "low",
      message: "LinkedIn URL seems improperly formatted. Standardize your social profile link.",
      target_field_path: "contact.linkedin_url",
      status: "open"
    });
  }
  formatScore = Math.max(0, formatScore);

  // B. Section Completeness (0-100)
  // Expects specific blocks based on Student vs Professional & India context
  let completenessScore = 100;
  const isStudent = resumeData.segment_fields?.segment === "student";
  const isIndia = resumeData.segment_fields?.region === "India";

  if (isStudent) {
    if (resumeData.projects.length === 0) {
      completenessScore -= 30;
      findings.push({
        id: "comp-proj",
        category: "completeness",
        severity: "high",
        message: "Missing Academic Projects. Since you are a student, projects are critical to evidence your hands-on coding skills.",
        target_field_path: "projects",
        status: "open"
      });
    }
    if (isIndia && resumeData.segment_fields.include_marks_10_12) {
      const hasBoardMarks = resumeData.education.some(edu => edu.board_x || edu.board_xii);
      if (!hasBoardMarks) {
        completenessScore -= 15;
        findings.push({
          id: "comp-marks",
          category: "completeness",
          severity: "medium",
          message: "India Campus standard: 10th and 12th board marks/CGPA should be clearly documented.",
          target_field_path: "education",
          status: "open"
        });
      }
    }
  } else {
    // Professional
    if (resumeData.experience.length === 0) {
      completenessScore -= 40;
      findings.push({
        id: "comp-exp",
        category: "completeness",
        severity: "high",
        message: "Work Experience list is empty. Professional resumes require detailed corporate logs.",
        target_field_path: "experience",
        status: "open"
      });
    }
  }

  if (resumeData.skills.technical.length < 3) {
    completenessScore -= 15;
    findings.push({
      id: "comp-skills",
      category: "completeness",
      severity: "medium",
      message: "Technical skills inventory is thin. Document at least 3 high-impact technologies.",
      target_field_path: "skills.technical",
      status: "open"
    });
  }
  completenessScore = Math.max(0, completenessScore);

  // C. Quantification Density (0-100)
  // Ratio of metric-holding bullets to total bullets
  let totalBullets = 0;
  let metricBullets = 0;

  const countMetrics = (b: Bullet, path: string) => {
    totalBullets++;
    // Heuristic: check if has_metric is true OR regex detects metric numbers
    const numMatches = extractNumbers(b.text);
    const hasNum = numMatches.length > 0;
    if (b.has_metric || hasNum) {
      metricBullets++;
    } else {
      findings.push({
        id: `quant-${b.id}`,
        category: "quantification",
        severity: "high",
        message: `Bullet "${b.text.substring(0, 30)}..." lacks a quantified metric or performance percentage. Add a metric to prove business impact.`,
        target_field_path: path,
        status: "open"
      });
    }
  };

  resumeData.experience.forEach((exp, eIdx) => {
    exp.bullets.forEach((b, bIdx) => countMetrics(b, `experience[${eIdx}].bullets[${bIdx}]`));
  });
  resumeData.projects.forEach((proj, pIdx) => {
    proj.bullets.forEach((b, bIdx) => countMetrics(b, `projects[${pIdx}].bullets[${bIdx}]`));
  });

  const quantScore = totalBullets > 0 ? Math.round((metricBullets / totalBullets) * 100) : 0;

  // D. Action Verb Strength (0-100)
  // Checks weak openings
  let weakOpenCount = 0;
  let assessedBullets = 0;

  const checkVerbs = (b: Bullet, path: string) => {
    assessedBullets++;
    const textLower = b.text.trim().toLowerCase();
    const opensWithWeak = WEAK_OPENERS.some(weak => textLower.startsWith(weak));
    if (opensWithWeak) {
      weakOpenCount++;
      findings.push({
        id: `verb-${b.id}`,
        category: "verbs",
        severity: "medium",
        message: `Bullet starts with a weak opener. Replace with a punchy action verb.`,
        target_field_path: path,
        status: "open"
      });
    }
  };

  resumeData.experience.forEach((exp, eIdx) => {
    exp.bullets.forEach((b, bIdx) => checkVerbs(b, `experience[${eIdx}].bullets[${bIdx}]`));
  });
  resumeData.projects.forEach((proj, pIdx) => {
    proj.bullets.forEach((b, bIdx) => checkVerbs(b, `projects[${pIdx}].bullets[${bIdx}]`));
  });

  const verbScore = assessedBullets > 0 ? Math.round(((assessedBullets - weakOpenCount) / assessedBullets) * 100) : 100;

  // E. JD Keyword Match (0-100)
  let jdScore = 0;
  let matchedKeywords: string[] = [];
  let promotableKeywords: string[] = [];
  let missingKeywords: string[] = [];

  if (jdText && ai) {
    try {
      const skillsContext = JSON.stringify(resumeData.skills);
      const experienceContext = JSON.stringify(resumeData.experience.map(e => e.bullets.map(b => b.text)));
      
      const prompt = `Match the skills/experience below with the following Job Description (JD).
Identify and extract key technical keywords, and group them strictly as:
1. matched: Present in skills or experienced bullets.
2. promotable: Implied or mentioned indirectly, but could be framed stronger.
3. genuinely_missing: Crucial JD requirements that are completely absent.

Provide only JSON following this schema:
{
  "score": number (0-100 representing percentage match of essential criteria),
  "matched": string[],
  "promotable": string[],
  "genuinely_missing": string[]
}

Skills:
${skillsContext}
Experience:
${experienceContext}

Job Description:
"""
${jdText}
"""`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.INTEGER },
              matched: { type: Type.ARRAY, items: { type: Type.STRING } },
              promotable: { type: Type.ARRAY, items: { type: Type.STRING } },
              genuinely_missing: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["score", "matched", "promotable", "genuinely_missing"]
          }
        }
      });

      const parsed = JSON.parse(response.text || "{}");
      jdScore = parsed.score || 0;
      matchedKeywords = parsed.matched || [];
      promotableKeywords = parsed.promotable || [];
      missingKeywords = parsed.genuinely_missing || [];

      if (missingKeywords.length > 0) {
        findings.push({
          id: "jd-missing-keywords",
          category: "jd_match",
          severity: "high",
          message: `Genuinely missing skills for this JD: ${missingKeywords.slice(0, 4).join(", ")}. Do not fabricate; focus on adding relevant coursework or side projects instead.`,
          target_field_path: "skills.technical",
          status: "open"
        });
      }
    } catch (e) {
      console.error("JD Matching failed:", e);
      jdScore = 50; // fallback
    }
  } else {
    // If no JD, keyword match defaults to N/A or a modest default score
    jdScore = 100; // Not penalized if unprovided, or excluded from weight
  }

  // F. Length Density Fit (0-100)
  // Student -> 1 page target. Professional -> 1-2 pages depending on year density.
  let lengthScore = 100;
  const totalSectionsCount = 
    (resumeData.experience.length ? 1 : 0) + 
    (resumeData.projects.length ? 1 : 0) + 
    (resumeData.skills.technical.length ? 1 : 0);
  
  if (isStudent && totalSectionsCount > 5) {
    lengthScore -= 15;
    findings.push({
      id: "len-density",
      category: "length",
      severity: "low",
      message: "Student resumes should ideally fit onto exactly 1 page. Consider condensing spacing or word count.",
      target_field_path: "meta",
      status: "open"
    });
  }

  // Final weighted scoring snapshot
  const activeWeights = { ...RUBRIC_WEIGHTS };
  if (!jdText) {
    // Adjust weights if no JD is provided
    activeWeights.format_parseability = 0.20;
    activeWeights.section_completeness = 0.30;
    activeWeights.quantification_density = 0.30;
    activeWeights.action_verb_strength = 0.10;
    activeWeights.length_density_fit = 0.10;
    activeWeights.jd_keyword_match = 0;
  }

  const overallScore = Math.round(
    (formatScore * activeWeights.format_parseability) +
    (completenessScore * activeWeights.section_completeness) +
    (quantScore * activeWeights.quantification_density) +
    (verbScore * activeWeights.action_verb_strength) +
    (jdScore * activeWeights.jd_keyword_match) +
    (lengthScore * activeWeights.length_density_fit)
  );

  return {
    overallScore,
    breakdown: {
      format_parseability: formatScore,
      section_completeness: completenessScore,
      quantification_density: quantScore,
      action_verb_strength: verbScore,
      jd_keyword_match: jdText ? jdScore : 100,
      length_density_fit: lengthScore
    },
    findings
  };
}

/**
 * 3. BULLET REWRITE PIPELINE (Grounded, Hallucination-Guarded)
 */
export interface RewriteResponse {
  rewrittenText: string;
  rejectionHappened: boolean;
  explanation: string;
  originalNumbers: string[];
  suggestedNumbers: string[];
}

export async function rewriteBullet(bulletText: string, context: string): Promise<RewriteResponse> {
  const originalNums = extractNumbers(bulletText);

  if (!ai) {
    console.log("No GEMINI_API_KEY config. Returning simulated grounded rewrite.");
    return {
      rewrittenText: `Optimized: Successfully led software developments and database upgrades [ADD METRIC].`,
      rejectionHappened: false,
      explanation: "No Gemini Key - provided static grounded rewrite template.",
      originalNumbers: originalNums,
      suggestedNumbers: []
    };
  }

  try {
    const prompt = `You are a strict, professional Resume Bullet Editor.
Your job is to rewrite a resume bullet to strengthen the action verbs and sentence structure.

CRITICAL METER-GROUNDING RULES:
1. You may NOT introduce any new numbers, percentages, currency, metrics, or quantified outcomes.
2. If the bullet contains no numbers/metrics, you MUST NOT invent one. Instead, rewrite the bullet with a stronger verb and append "[ADD METRIC]" at the end.
3. If the bullet already contains metrics (e.g. "reduced load by 35%"), you must retain those exact metrics without altering the numbers.

Original Bullet: "${bulletText}"
Surrounding context/Role: "${context}"

Provide output strictly as JSON with this schema:
{
  "rewrite": "the rewritten bullet",
  "explanation": "why this rewrite is stronger"
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            rewrite: { type: Type.STRING },
            explanation: { type: Type.STRING }
          },
          required: ["rewrite", "explanation"]
        }
      }
    });

    const parsed = JSON.parse(response.text || "{}");
    const aiRewrite = parsed.rewrite || bulletText;
    const aiExplanation = parsed.explanation || "Refined for action verb prominence.";

    // Run numbers-diff grounding guard!
    const isGrounded = validateGroundedNumbers(bulletText, aiRewrite);
    
    if (!isGrounded) {
      // REJECTED server-side to prevent metric fabrication!
      const fallbackRewrite = aiRewrite.replace(/\b\d+(?:[.,]\d+)?%?|\$\d+(?:[.,]\d+)?[kK]?[mM]?/g, "[ADD METRIC]");
      console.warn(`[GROUNDING GAURD] REJECTED AI rewrite containing fabricated metrics: "${aiRewrite}". Fell back to: "${fallbackRewrite}"`);
      return {
        rewrittenText: fallbackRewrite.includes("[ADD METRIC]") ? fallbackRewrite : `${fallbackRewrite} [ADD METRIC]`,
        rejectionHappened: true,
        explanation: "The AI model attempted to fabricate numerical metrics. For security and resume truthfulness, Groundwork rejected these metrics and inserted [ADD METRIC] placeholders instead.",
        originalNumbers: originalNums,
        suggestedNumbers: extractNumbers(aiRewrite)
      };
    }

    return {
      rewrittenText: aiRewrite,
      rejectionHappened: false,
      explanation: aiExplanation,
      originalNumbers: originalNums,
      suggestedNumbers: extractNumbers(aiRewrite)
    };
  } catch (err) {
    console.error("Gemini rewrite failed:", err);
    return {
      rewrittenText: `${bulletText} [ADD METRIC]`,
      rejectionHappened: false,
      explanation: "Rewrite service timed out. Placed metric marker manual update.",
      originalNumbers: originalNums,
      suggestedNumbers: []
    };
  }
}
