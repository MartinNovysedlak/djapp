-- Reference wall-clock start used when editing templates in absolute-time mode

ALTER TABLE public.program_templates
  ADD COLUMN IF NOT EXISTS reference_start_time TIME NOT NULL DEFAULT '16:00:00';
