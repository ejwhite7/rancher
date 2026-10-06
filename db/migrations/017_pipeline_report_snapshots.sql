create table if not exists pipeline_report_snapshots (
  report_slot text primary key,
  deals jsonb not null,
  created_at timestamptz not null default now()
);

alter table pipeline_report_snapshots enable row level security;
revoke all on pipeline_report_snapshots from anon, authenticated;
