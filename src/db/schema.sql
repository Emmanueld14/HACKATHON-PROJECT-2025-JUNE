create extension if not exists pgcrypto;

-- Enable pgvector before running the rag_chunks table if your Postgres host supports it:
-- create extension if not exists vector;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists environment_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  profile_name text not null default 'Primary machine',
  os_name text not null,
  os_version text,
  os_arch text,
  shell text,
  cpu_model text,
  cpu_cores integer,
  ram_gb numeric,
  gpu_vendor text,
  gpu_model text,
  gpu_vram_gb numeric,
  gpu_driver_version text,
  cuda_version text,
  rocm_version text,
  package_managers jsonb not null default '[]'::jsonb,
  installed_tools jsonb not null default '{}'::jsonb,
  environment_variables jsonb not null default '{}'::jsonb,
  important_paths jsonb not null default '{}'::jsonb,
  raw_scan jsonb not null default '{}'::jsonb,
  scan_warnings jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists workflow_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  environment_profile_id uuid not null references environment_profiles(id) on delete restrict,
  domain text not null check (domain in ('games', 'programming', 'blender', 'editing', 'sports', 'aob')),
  user_goal text not null,
  control_filters jsonb not null default '{}'::jsonb,
  retrieved_context jsonb not null default '[]'::jsonb,
  prompt_request jsonb not null,
  generated_guide jsonb,
  status text not null default 'prompt_ready',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists workflow_steps (
  id uuid primary key default gen_random_uuid(),
  workflow_run_id uuid not null references workflow_runs(id) on delete cascade,
  step_index integer not null,
  title text not null,
  objective text not null,
  instructions text not null,
  commands jsonb not null default '[]'::jsonb,
  expected_output text,
  validation_check text,
  failure_symptoms jsonb not null default '[]'::jsonb,
  recovery_path text,
  risk_level text not null default 'low' check (risk_level in ('low', 'medium', 'high')),
  requires_admin boolean not null default false,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  unique (workflow_run_id, step_index)
);

create table if not exists error_events (
  id uuid primary key default gen_random_uuid(),
  workflow_run_id uuid not null references workflow_runs(id) on delete cascade,
  workflow_step_id uuid references workflow_steps(id) on delete set null,
  error_type text not null default 'user_submitted_log',
  user_submitted_log text not null,
  screenshot_url text,
  screenshot_ocr text,
  detected_cause text,
  severity text,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists diagnostic_patches (
  id uuid primary key default gen_random_uuid(),
  error_event_id uuid not null references error_events(id) on delete cascade,
  workflow_run_id uuid not null references workflow_runs(id) on delete cascade,
  prompt_request jsonb not null,
  diagnosis jsonb,
  patch_instructions text,
  commands jsonb not null default '[]'::jsonb,
  files_to_modify jsonb not null default '[]'::jsonb,
  rollback_plan text,
  confidence numeric,
  applied boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists rag_sources (
  id uuid primary key default gen_random_uuid(),
  domain text not null check (domain in ('games', 'programming', 'blender', 'editing', 'sports', 'aob')),
  source_type text not null,
  title text not null,
  url text not null,
  trust_level text not null default 'official',
  last_indexed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (url)
);

create table if not exists rag_chunks (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references rag_sources(id) on delete cascade,
  chunk_text text not null,
  metadata jsonb not null default '{}'::jsonb,
  -- Uncomment after enabling pgvector and set dimensions to your embedding model.
  -- embedding vector(1536),
  created_at timestamptz not null default now()
);

create index if not exists environment_profiles_user_id_idx on environment_profiles(user_id);
create index if not exists workflow_runs_user_id_idx on workflow_runs(user_id);
create index if not exists workflow_runs_environment_profile_id_idx on workflow_runs(environment_profile_id);
create index if not exists workflow_steps_workflow_run_id_idx on workflow_steps(workflow_run_id);
create index if not exists error_events_workflow_run_id_idx on error_events(workflow_run_id);
create index if not exists diagnostic_patches_workflow_run_id_idx on diagnostic_patches(workflow_run_id);
create index if not exists rag_sources_domain_idx on rag_sources(domain);
create index if not exists rag_chunks_source_id_idx on rag_chunks(source_id);
