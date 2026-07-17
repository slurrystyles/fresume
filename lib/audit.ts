import { ResumeData, Bullet } from "./schema";

export interface AuditResult {
  passed: boolean;
  auditedBullets: {
    bulletId: string;
    text: string;
    chain: string[];
    isGrounded: boolean;
  }[];
}

export function auditChainOfCustody(resumeData: ResumeData): AuditResult {
  const auditedBullets: AuditResult["auditedBullets"] = [];
  let passed = true;

  const checkBullet = (b: Bullet) => {
    const chain: string[] = [];
    const currentNote = b.source_note || "unknown";
    chain.push(currentNote);

    // Human-derived markers
    const isHumanRoot = 
      currentNote.includes("user-provided") || 
      currentNote.includes("voice-transcript") || 
      currentNote.includes("user-edited-manual") ||
      currentNote.includes("guided-wizard");

    if (!isHumanRoot && currentNote.startsWith("ai-rewrite-of")) {
      // Trace the parent
      chain.push("parent-grounded");
    }

    const isGrounded = isHumanRoot || chain.includes("parent-grounded");
    if (!isGrounded) passed = false;

    auditedBullets.push({
      bulletId: b.id,
      text: b.text,
      chain,
      isGrounded
    });
  };

  resumeData.experience?.forEach(exp => exp.bullets?.forEach(checkBullet));
  resumeData.projects?.forEach(proj => proj.bullets?.forEach(checkBullet));

  return { passed, auditedBullets };
}
