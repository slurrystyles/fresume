import { createClient } from '@supabase/supabase-js';
import { Resume, ResumeData, ExportRecord, JDRecord } from './schema';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Initialize Supabase client
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

function assertSupabase() {
  if (!supabase) {
    throw new Error(
      "Supabase connection error: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing in your environment configuration. Please configure these variables in the Settings menu."
    );
  }
}

async function getAuthUserId(): Promise<string> {
  assertSupabase();
  const { data: { user }, error } = await supabase!.auth.getUser();
  if (error || !user) {
    throw new Error("Authentication failed: No active Supabase session found. Please log in or authenticate to manage your resume data.");
  }

  // Auto-ensure user record exists in public.users to satisfy foreign key constraints
  try {
    const { data: profile, error: profileError } = await supabase!
      .from('users')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.warn("Could not query public.users table:", profileError.message);
    }

    if (!profile) {
      // Create user profile record in public.users using race-safe upsert with options from metadata
      const signupSegment = user.user_metadata?.segment || 'professional';
      const signupRegion = user.user_metadata?.region || 'India';

      const { error: insertError } = await supabase!
        .from('users')
        .upsert({
          id: user.id,
          email: user.email || '',
          segment: signupSegment,
          region: signupRegion
        }, { onConflict: 'id' });

      if (insertError) {
        console.error("Error auto-inserting public.users profile:", insertError);
        throw new Error(`Profile initialization failed: ${insertError.message}`);
      }
    }
  } catch (profileErr: any) {
    console.error("Ensure user record exception:", profileErr);
    throw new Error(`Failed to verify or establish user database account record: ${profileErr.message}`);
  }

  return user.id;
}

export class Database {
  /**
   * Fetch all resumes for the authenticated user from Supabase.
   */
  static async getResumes(): Promise<Resume[]> {
    assertSupabase();
    await getAuthUserId();

    const { data, error } = await supabase!
      .from('resumes')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error("Supabase getResumes error:", error);
      throw new Error(`Database error loading resumes: ${error.message}`);
    }

    return (data || []) as Resume[];
  }

  /**
   * Fetch a single resume by ID from Supabase.
   */
  static async getResumeById(id: string): Promise<Resume | null> {
    assertSupabase();
    await getAuthUserId();

    const { data, error } = await supabase!
      .from('resumes')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error("Supabase getResumeById error:", error);
      throw new Error(`Database error fetching resume [id: ${id}]: ${error.message}`);
    }

    return data as Resume | null;
  }

  /**
   * Save (upsert) a resume and insert a new historical version into resume_versions table.
   */
  static async saveResume(resume: Resume, isNewVersion = false): Promise<void> {
    assertSupabase();
    const userId = await getAuthUserId();

    if (isNewVersion) {
      if (!resume.resume_data.meta) {
        resume.resume_data.meta = { version_number: 1, last_scored_at: new Date().toISOString() };
      } else {
        resume.resume_data.meta.version_number = (resume.resume_data.meta.version_number || 1) + 1;
      }
    }

    const versionNum = resume.resume_data.meta?.version_number || 1;

    // Try executing atomically via supabase.rpc transaction first
    try {
      const { error: rpcError } = await supabase!.rpc('save_resume_with_version', {
        p_resume_id: resume.id,
        p_user_id: userId,
        p_title: resume.title,
        p_status: resume.status || 'draft',
        p_source_type: resume.source_type || 'scratch',
        p_resume_data: resume.resume_data,
        p_score_snapshot: resume.score_snapshot || null,
        p_is_new_version: isNewVersion,
        p_version_number: versionNum
      });

      if (!rpcError) {
        // Success! Atomic operation complete.
        return;
      }

      // If it's a function missing error, fall back to individual calls
      if (rpcError.code === '3F000' || (rpcError.message?.toLowerCase().includes('function') && rpcError.message?.toLowerCase().includes('does not exist'))) {
        console.warn("RPC function save_resume_with_version not found in database, falling back to non-atomic calls...");
      } else {
        console.error("Supabase RPC transaction error:", rpcError);
        throw new Error(`Database transaction failed: ${rpcError.message}`);
      }
    } catch (rpcException: any) {
      console.warn("Exception calling save_resume_with_version, falling back...", rpcException);
    }

    // Fallback: Individual non-atomic calls
    // Save/Upsert Resume
    const { error: upsertError } = await supabase!
      .from('resumes')
      .upsert({
        id: resume.id,
        user_id: userId,
        title: resume.title,
        status: resume.status || 'draft',
        source_type: resume.source_type || 'scratch',
        resume_data: resume.resume_data,
        score_snapshot: resume.score_snapshot,
        updated_at: new Date().toISOString()
      });

    if (upsertError) {
      console.error("Supabase saveResume error:", upsertError);
      throw new Error(`Database error saving resume: ${upsertError.message}`);
    }

    // Only insert historical version record in Supabase if isNewVersion is true
    if (isNewVersion) {
      const { error: versionError } = await supabase!
        .from('resume_versions')
        .insert({
          resume_id: resume.id,
          version_number: versionNum,
          resume_data: resume.resume_data,
          created_by: userId
        });

      if (versionError) {
        console.error("Supabase insert resume version error:", versionError);
        throw new Error(`Database error saving historical version trace: ${versionError.message}`);
      }
    }
  }

  /**
   * Retrieve historical versions of a specific resume from Supabase.
   */
  static async getResumeVersions(resumeId: string): Promise<any[]> {
    assertSupabase();
    await getAuthUserId();

    const { data, error } = await supabase!
      .from('resume_versions')
      .select('*')
      .eq('resume_id', resumeId)
      .order('version_number', { ascending: false });

    if (error) {
      console.error("Supabase getResumeVersions error:", error);
      throw new Error(`Database error retrieving historical versions: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Instantiate a new clean Resume record linked to the authenticated user ID.
   */
  static async createNewResume(
    title: string, 
    segment: "student" | "professional", 
    market: "india_campus" | "india_general" | "international"
  ): Promise<Resume> {
    assertSupabase();
    const userId = await getAuthUserId();
    const isIndia = market.startsWith("india");
    const resumeId = crypto.randomUUID ? crypto.randomUUID() : "resume_" + Math.random().toString(36).substring(2, 11);

    const newResume: Resume = {
      id: resumeId,
      user_id: userId,
      title: title || "Untitled Resume",
      status: "draft",
      source_type: "scratch",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      resume_data: {
        contact: {
          name: "",
          email: "",
          phone: "",
          location: isIndia ? "Delhi, India" : "New York, USA"
        },
        summary: "",
        education: [],
        experience: [],
        projects: [],
        skills: {
          technical: [],
          tools: [],
          soft: []
        },
        certifications: [],
        achievements: [],
        segment_fields: {
          segment,
          region: isIndia ? "India" : "International",
          target_market: market,
          photo_required: false,
          include_marks_10_12: market === "india_campus"
        },
        meta: {
          version_number: 1,
          last_scored_at: new Date().toISOString()
        }
      }
    };

    const { error } = await supabase!
      .from('resumes')
      .insert({
        id: newResume.id,
        user_id: userId,
        title: newResume.title,
        status: newResume.status,
        source_type: newResume.source_type,
        resume_data: newResume.resume_data,
        score_snapshot: newResume.score_snapshot,
        created_at: newResume.created_at,
        updated_at: newResume.updated_at
      });

    if (error) {
      console.error("Supabase createNewResume error:", error);
      throw new Error(`Database error creating new resume record: ${error.message}`);
    }

    return newResume;
  }

  /**
   * Delete a resume by ID from Supabase.
   */
  static async deleteResume(id: string): Promise<void> {
    assertSupabase();
    await getAuthUserId();

    const { error } = await supabase!
      .from('resumes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error("Supabase deleteResume error:", error);
      throw new Error(`Database error deleting resume: ${error.message}`);
    }
  }

  /**
   * Save a newly created download export with its parseability report to Supabase.
   */
  static async saveExport(exportRec: ExportRecord): Promise<void> {
    assertSupabase();
    await getAuthUserId();

    const id = exportRec.id || (crypto.randomUUID ? crypto.randomUUID() : "export_" + Math.random().toString(36).substring(2, 11));
    const finalRec = { ...exportRec, id, created_at: exportRec.created_at || new Date().toISOString() };

    const { error } = await supabase!
      .from('exports')
      .upsert({
        id: finalRec.id,
        resume_id: finalRec.resume_id,
        format: finalRec.format,
        file_url: finalRec.file_url || null,
        parseability_report: finalRec.parseability_report || null,
        created_at: finalRec.created_at
      });

    if (error) {
      console.error("Supabase saveExport error:", error);
      throw new Error(`Database error logging download export: ${error.message}`);
    }
  }

  /**
   * Retrieve download export records history associated with a resume from Supabase.
   */
  static async getExports(resumeId: string): Promise<ExportRecord[]> {
    assertSupabase();
    await getAuthUserId();

    const { data, error } = await supabase!
      .from('exports')
      .select('*')
      .eq('resume_id', resumeId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Supabase getExports error:", error);
      throw new Error(`Database error retrieving export logs: ${error.message}`);
    }

    return (data || []) as ExportRecord[];
  }

  /**
   * Save a job description to library in Supabase.
   */
  static async saveJD(jdRec: JDRecord): Promise<void> {
    assertSupabase();
    const userId = await getAuthUserId();

    const id = jdRec.id || (crypto.randomUUID ? crypto.randomUUID() : "jd_" + Math.random().toString(36).substring(2, 11));
    const finalRec = { ...jdRec, id, created_at: jdRec.created_at || new Date().toISOString() };

    const { error } = await supabase!
      .from('jds')
      .upsert({
        id: finalRec.id,
        user_id: userId,
        title: finalRec.title,
        text: finalRec.text,
        company: finalRec.company || null,
        created_at: finalRec.created_at
      });

    if (error) {
      console.error("Supabase saveJD error:", error);
      throw new Error(`Database error saving job description: ${error.message}`);
    }
  }

  /**
   * Fetch all saved job descriptions in library from Supabase.
   */
  static async getJDs(): Promise<JDRecord[]> {
    assertSupabase();
    await getAuthUserId();

    const { data, error } = await supabase!
      .from('jds')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Supabase getJDs error:", error);
      throw new Error(`Database error loading job descriptions library: ${error.message}`);
    }

    return (data || []) as JDRecord[];
  }
}
