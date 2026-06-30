CREATE TABLE public.visit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip text,
  user_agent text,
  path text,
  referrer text,
  country text,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.visit_logs TO service_role;

ALTER TABLE public.visit_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX visit_logs_created_at_idx ON public.visit_logs (created_at DESC);
CREATE INDEX visit_logs_ip_idx ON public.visit_logs (ip);

-- No policies for anon/authenticated: table is service-role only.
-- This blocks client reads/writes; the server function uses the admin client.