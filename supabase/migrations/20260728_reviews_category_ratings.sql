-- Category ratings (1–5) alongside overall rating average
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS rating_communication SMALLINT
    CHECK (rating_communication IS NULL OR rating_communication BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS rating_punctuality SMALLINT
    CHECK (rating_punctuality IS NULL OR rating_punctuality BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS rating_performance SMALLINT
    CHECK (rating_performance IS NULL OR rating_performance BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS rating_requests SMALLINT
    CHECK (rating_requests IS NULL OR rating_requests BETWEEN 1 AND 5);

COMMENT ON COLUMN public.reviews.rating_communication IS 'Komunikácia (1–5)';
COMMENT ON COLUMN public.reviews.rating_punctuality IS 'Dochvíľnosť (1–5)';
COMMENT ON COLUMN public.reviews.rating_performance IS 'Výkon/hudba (1–5)';
COMMENT ON COLUMN public.reviews.rating_requests IS 'Ochota vyhovieť požiadavkám (1–5)';
