-- ==========================================
-- SEED DATA: Sample Campaigns for Sprint 2
-- Run this in Supabase SQL Editor
-- ==========================================

INSERT INTO public.campaigns (campaign_code, brand_name, category, platform, budget_type, deliverables, product_links, requirements, gender_required, is_live, status)
VALUES
  ('CAMP001', 'Nike', 'Fashion & Fitness', 'Instagram', 'Paid', '1 Reel + 2 Stories showcasing Nike running shoes', ARRAY['https://nike.com/running'], 'Must have 5K+ followers. Fitness/Lifestyle niche preferred. Must tag @nike and use #JustDoIt', 'Any', true, 'Active'),
  ('CAMP002', 'Spotify India', 'Music & Entertainment', 'Instagram', 'Barter', '1 Reel featuring your favorite Spotify playlist + Story with swipe-up link', ARRAY['https://open.spotify.com'], 'Music/Lifestyle creators. Minimum 3K followers. Must use #SpotifyWrapped', 'Any', true, 'Active'),
  ('CAMP003', 'Mamaearth', 'Beauty & Skincare', 'Instagram', 'Paid', '1 Reel reviewing Ubtan Face Wash + 3 Stories showing daily routine', ARRAY['https://mamaearth.in/ubtan-face-wash'], 'Beauty/Skincare niche. Female creators preferred. Must have 2K+ followers.', 'Female', true, 'Active'),
  ('CAMP004', 'boAt Lifestyle', 'Tech & Audio', 'YouTube', 'Paid', '1 YouTube Short unboxing boAt Airdopes + Instagram Story', ARRAY['https://boat-lifestyle.com/airdopes'], 'Tech/Lifestyle niche. Must create engaging unboxing content. 5K+ subscribers preferred.', 'Any', true, 'Active'),
  ('CAMP005', 'Zomato', 'Food & Delivery', 'Instagram', 'Barter', '2 Reels + 3 Stories featuring Zomato food ordering experience', ARRAY['https://zomato.com'], 'Food bloggers or Lifestyle creators. Show real ordering experience. Min 1K followers.', 'Any', true, 'Active'),
  ('CAMP006', 'Nykaa', 'Beauty & Makeup', 'Instagram', 'Paid', '1 Reel: Get Ready With Me using Nykaa products + 2 Stories', ARRAY['https://nykaa.com'], 'Beauty/Fashion niche. Female creators. Must use #NykaaHaul and tag @mynykaa', 'Female', true, 'Active'),
  ('CAMP007', 'Flipkart', 'E-Commerce', 'Instagram', 'Paid', '1 Reel showcasing Big Billion Days haul + 3 Stories with product links', ARRAY['https://flipkart.com'], 'Lifestyle/Fashion/Tech creators. Must have 10K+ followers. Use #BigBillionDays', 'Any', true, 'Active'),
  ('CAMP008', 'Sugar Cosmetics', 'Beauty & Makeup', 'Instagram', 'Barter', '1 Tutorial Reel using Sugar Cosmetics lipstick shades + Swatch Stories', ARRAY['https://sugarcosmetics.com'], 'Beauty creators. Female preferred. Show authentic swatches and review.', 'Female', true, 'Active');

-- Insert some default form config fields
INSERT INTO public.apply_form_config (campaign_code, field_name, field_type, field_options, is_required, field_order)
VALUES
  ('DEFAULT', 'Why do you want to collaborate?', 'textarea', NULL, true, 1),
  ('DEFAULT', 'Your content niche', 'dropdown', '["Fashion", "Beauty", "Tech", "Food", "Fitness", "Lifestyle", "Travel", "Entertainment", "Education", "Other"]', true, 2),
  ('DEFAULT', 'Instagram Profile Link', 'text', NULL, true, 3);
