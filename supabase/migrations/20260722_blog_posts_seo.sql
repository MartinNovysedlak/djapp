-- SEO fields for blog posts
ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS seo_title TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS seo_description TEXT NOT NULL DEFAULT '';

COMMENT ON COLUMN public.blog_posts.seo_title IS 'Optional SEO title; falls back to title when empty.';
COMMENT ON COLUMN public.blog_posts.seo_description IS 'Optional SEO meta description; falls back to excerpt when empty.';
