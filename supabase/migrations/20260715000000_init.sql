-- Supabase Schema Initialization for Groundwork
-- Enable UUID generation extension
create extension if not exists "uuid-ossp";

-- 1. Users Table (Linked to auth.users)
create table public.users (
    id uuid primary key references auth.users on delete cascade,
    email text,
    segment text check (segment in ('student', 'professional')),
    region text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Subscriptions Table
create table public.subscriptions (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references public.users(id) on delete cascade not null,
    tier text check (tier in ('free', 'pro')) default 'free' not null,
    status text check (status in ('active', 'expired', 'canceled')) default 'active' not null,
    ends_at timestamp with time zone,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Resumes Table
create table public.resumes (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references public.users(id) on delete cascade not null,
    title text not null default 'Untitled Resume',
    status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
    source_type text not null default 'scratch' check (source_type in ('scratch', 'upload')),
    resume_data jsonb not null default '{}'::jsonb,
    score_snapshot jsonb default null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Resume Versions Table (For session continuity and undo history)
create table public.resume_versions (
    id uuid primary key default uuid_generate_v4(),
    resume_id uuid references public.resumes(id) on delete cascade not null,
    version_number integer not null,
    resume_data jsonb not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    created_by uuid references public.users(id) on delete set null
);

-- 5. Job Descriptions (JDs) Table
create table public.jds (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references public.users(id) on delete cascade,
    title text not null,
    text text not null,
    company text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Findings Table (Line-level analysis issues)
create table public.findings (
    id uuid primary key default uuid_generate_v4(),
    resume_id uuid references public.resumes(id) on delete cascade not null,
    category text not null, -- 'quantification', 'verbs', 'completeness', etc.
    severity text not null check (severity in ('high', 'medium', 'low')),
    message text not null,
    target_field_path text not null,
    status text not null check (status in ('open', 'fixed', 'dismissed')) default 'open',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. Fixes Table (Fix audit trail / history)
create table public.fixes (
    id uuid primary key default uuid_generate_v4(),
    finding_id uuid references public.findings(id) on delete cascade not null,
    fix_type text not null, -- 'user-provided', 'voice-transcript', 'ai-rewrite'
    before_value text,
    after_value text not null,
    status text not null check (status in ('draft', 'applied', 'rejected')) default 'applied',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. Exports Table
create table public.exports (
    id uuid primary key default uuid_generate_v4(),
    resume_id uuid references public.resumes(id) on delete cascade not null,
    format text not null check (format in ('pdf', 'docx')),
    file_url text,
    parseability_report jsonb default null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 9. Audit Logs Table (Full chain-of-custody tracking)
create table public.audit_logs (
    id uuid primary key default uuid_generate_v4(),
    resume_id uuid references public.resumes(id) on delete cascade not null,
    user_id uuid references public.users(id) on delete cascade not null,
    field_path text not null,
    old_value text,
    new_value text not null,
    source_note text not null, -- 'user-provided', 'voice-transcript', 'ai-rewrite', etc.
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.users enable row level security;
alter table public.subscriptions enable row level security;
alter table public.resumes enable row level security;
alter table public.resume_versions enable row level security;
alter table public.jds enable row level security;
alter table public.findings enable row level security;
alter table public.fixes enable row level security;
alter table public.exports enable row level security;
alter table public.audit_logs enable row level security;

-- RLS Policies

-- Users policies
create policy "Users can only view their own user profile"
    on public.users for select using (auth.uid() = id);
create policy "Users can only update their own user profile"
    on public.users for update using (auth.uid() = id);
create policy "Users can only insert their own user profile"
    on public.users for insert with check (auth.uid() = id);

-- Subscriptions policies
create policy "Users can only view their own subscription"
    on public.subscriptions for select using (auth.uid() = user_id);

-- Resumes policies
create policy "Users can only insert their own resumes"
    on public.resumes for insert with check (auth.uid() = user_id);
create policy "Users can only view their own resumes"
    on public.resumes for select using (auth.uid() = user_id);
create policy "Users can only update their own resumes"
    on public.resumes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can only delete their own resumes"
    on public.resumes for delete using (auth.uid() = user_id);

-- Resume Versions policies
create policy "Users can view versions of owned resumes"
    on public.resume_versions for select using (
        exists (select 1 from public.resumes where resumes.id = resume_versions.resume_id and resumes.user_id = auth.uid())
    );
create policy "Users can insert versions of owned resumes"
    on public.resume_versions for insert with check (
        exists (select 1 from public.resumes where resumes.id = resume_versions.resume_id and resumes.user_id = auth.uid())
    );

-- JDs policies
create policy "Users can view their own JDs"
    on public.jds for select using (auth.uid() = user_id);
create policy "Users can insert their own JDs"
    on public.jds for insert with check (auth.uid() = user_id);

-- Findings policies
create policy "Users can view findings of owned resumes"
    on public.findings for select using (
        exists (select 1 from public.resumes where resumes.id = findings.resume_id and resumes.user_id = auth.uid())
    );
create policy "Users can modify findings of owned resumes"
    on public.findings for all using (
        exists (select 1 from public.resumes where resumes.id = findings.resume_id and resumes.user_id = auth.uid())
    );

-- Fixes policies
create policy "Users can view fixes of owned resumes"
    on public.fixes for select using (
        exists (
            select 1 from public.findings
            join public.resumes on resumes.id = findings.resume_id
            where findings.id = fixes.finding_id and resumes.user_id = auth.uid()
        )
    );
create policy "Users can insert fixes of owned resumes"
    on public.fixes for insert with check (
        exists (
            select 1 from public.findings
            join public.resumes on resumes.id = findings.resume_id
            where findings.id = fixes.finding_id and resumes.user_id = auth.uid()
        )
    );

-- Exports policies
create policy "Users can view exports of owned resumes"
    on public.exports for select using (
        exists (select 1 from public.resumes where resumes.id = exports.resume_id and resumes.user_id = auth.uid())
    );
create policy "Users can insert exports of owned resumes"
    on public.exports for insert with check (
        exists (select 1 from public.resumes where resumes.id = exports.resume_id and resumes.user_id = auth.uid())
    );

-- Audit Logs policies
create policy "Users can insert audit logs for owned resumes"
    on public.audit_logs for insert with check (
        exists (select 1 from public.resumes where resumes.id = audit_logs.resume_id and resumes.user_id = auth.uid())
    );
create policy "Users can view audit logs for owned resumes"
    on public.audit_logs for select using (
        exists (select 1 from public.resumes where resumes.id = audit_logs.resume_id and resumes.user_id = auth.uid())
    );

-- Atomic transaction helper for saving a resume and its version trace
create or replace function public.save_resume_with_version(
    p_resume_id uuid,
    p_user_id uuid,
    p_title text,
    p_status text,
    p_source_type text,
    p_resume_data jsonb,
    p_score_snapshot jsonb,
    p_is_new_version boolean,
    p_version_number integer
) returns void as $$
begin
    -- Enforce basic authentication owner boundary check
    if p_user_id <> auth.uid() then
        raise exception 'Unauthorized database action';
    end if;

    -- 1. Upsert the target resume document
    insert into public.resumes (id, user_id, title, status, source_type, resume_data, score_snapshot, updated_at)
    values (p_resume_id, p_user_id, p_title, p_status, p_source_type, p_resume_data, p_score_snapshot, timezone('utc'::text, now()))
    on conflict (id) do update set
        user_id = excluded.user_id,
        title = excluded.title,
        status = excluded.status,
        source_type = excluded.source_type,
        resume_data = excluded.resume_data,
        score_snapshot = excluded.score_snapshot,
        updated_at = excluded.updated_at;

    -- 2. Insert into historical version log only if explicit new version is requested
    if p_is_new_version then
        insert into public.resume_versions (resume_id, version_number, resume_data, created_by)
        values (p_resume_id, p_version_number, p_resume_data, p_user_id);
    end if;
end;
$$ language plpgsql security invoker;

