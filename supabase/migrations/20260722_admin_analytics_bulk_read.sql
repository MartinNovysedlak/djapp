-- Allow admins to read bulk inquiry tables for platform analytics
DROP POLICY IF EXISTS "Admins can read all bulk inquiries" ON public.bulk_inquiries;
CREATE POLICY "Admins can read all bulk inquiries"
  ON public.bulk_inquiries FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can read all bulk inquiry items" ON public.bulk_inquiry_items;
CREATE POLICY "Admins can read all bulk inquiry items"
  ON public.bulk_inquiry_items FOR SELECT
  USING (public.is_admin());
