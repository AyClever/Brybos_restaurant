-- ==============================================================================
-- BRYBOS RESTAURANT - OPTIONAL SEED DATA
-- ==============================================================================

-- 1. Restaurant Settings
INSERT INTO public.restaurant_settings (id, restaurant_name, phone, email, address, vat_rate, delivery_fee)
VALUES (
  'default',
  'BRYBOS Restaurant',
  '+234 800 BRYBOS (279267)',
  'hello@brybos.ng',
  '12 Restaurant Lane, Lekki Phase 1, Lagos, Nigeria',
  0.075,
  1500.00
) ON CONFLICT (id) DO NOTHING;

-- 2. Menu Categories
INSERT INTO public.menu_categories (name, slug, description, display_order)
VALUES
  ('Breakfast', 'breakfast', 'Start your day with wholesome morning delights', 1),
  ('Lunch', 'lunch', 'Sumptuous local and continental afternoon meals', 2),
  ('Dinner', 'dinner', 'Rich, flavourful night-time culinary experiences', 3),
  ('Drinks', 'drinks', 'Refreshing artisanal drinks and handcrafted cocktails', 4)
ON CONFLICT (name) DO NOTHING;

-- 3. Menu Items
INSERT INTO public.menu_items (name, description, price, category, image, badge, available)
VALUES
  ('Classic Pancake Stack', 'Fluffy golden pancakes with maple syrup, fresh berries and whipped cream', 3500.00, 'breakfast', '/food-breakfast.jpg', 'Popular', true),
  ('Full English Breakfast', 'Eggs, grilled sausages, bacon, toast, grilled tomatoes and mushrooms', 4500.00, 'breakfast', '/food-breakfast.jpg', 'Bestseller', true),
  ('Avocado Toast Special', 'Sourdough toast with smashed avocado, poached eggs and cherry tomatoes', 3200.00, 'breakfast', '/food-breakfast.jpg', NULL, true),
  ('Nigerian Akara & Pap', 'Freshly fried bean cakes served with smooth ogi and fresh pepper sauce', 2500.00, 'breakfast', '/food-breakfast.jpg', 'Local', true),

  ('Signature Jollof Rice', 'Premium smoky party jollof rice with fried chicken and coleslaw', 6500.00, 'lunch', '/food-rice.jpg', 'Bestseller', true),
  ('Grilled Chicken Burger', 'Spicy grilled chicken breast in sesame bun with fresh veggies and sauces', 4500.00, 'lunch', '/food-burger.jpg', 'Spicy 🌶', true),
  ('Fried Rice & Assorted', 'Nigerian-style fried rice with chicken, shrimp and mixed vegetables', 6000.00, 'lunch', '/food-rice.jpg', NULL, true),
  ('Ofada Rice & Ayamase', 'Local brown rice with authentic ayamase sauce and assorted meats', 5500.00, 'lunch', '/food-rice.jpg', 'Local', true),

  ('Peppered Goat Meat', 'Slow-cooked spicy goat meat in rich tomato and pepper sauce', 8500.00, 'dinner', '/food-dinner.jpg', 'Chef''s Pick', true),
  ('Egusi Soup & Pounded Yam', 'Delicious egusi soup with goat meat, stockfish and pounded yam', 7500.00, 'dinner', '/food-dinner.jpg', 'Popular', true),
  ('Seafood Okra Soup', 'Fresh seafood okra with crayfish, periwinkle and swallow of choice', 9000.00, 'dinner', '/food-dinner.jpg', NULL, true),
  ('Grilled Catfish & Plantain', 'Whole catfish marinated and grilled with spicy pepper sauce and fried plantain', 8000.00, 'dinner', '/food-dinner.jpg', NULL, true),

  ('Chapman Cocktail', 'Classic Nigerian Chapman with citrus, grenadine and soda water', 2000.00, 'drinks', '/food-drinks.jpg', 'Signature', true),
  ('Fresh Zobo Drink', 'Chilled hibiscus flower drink with ginger, cloves and pineapple', 1500.00, 'drinks', '/food-drinks.jpg', NULL, true),
  ('Tropical Fruit Smoothie', 'Mango, pineapple, banana and orange blended with yogurt', 2500.00, 'drinks', '/food-drinks.jpg', NULL, true),
  ('Premium Cocktail Mix', 'Signature house cocktail with premium spirits and fresh tropical fruits', 4500.00, 'drinks', '/food-drinks.jpg', 'Premium', true);

-- 4. Initial Riders (Sample profiles or records)
INSERT INTO public.riders (name, phone, bike_number, license_number, availability, total_deliveries, rating, earnings, lat, lng)
VALUES
  ('Emeka Okafor', '08012345678', 'ABJ-123-DP', 'LIC-001', 'available', 148, 4.8, 450000.00, 6.4531, 3.4258),
  ('Chukwuemeka Eze', '08023456789', 'LG-456-DP', 'LIC-002', 'busy', 97, 4.6, 310000.00, 6.4420, 3.4831),
  ('Babatunde Afolabi', '08034567890', 'KN-789-DP', 'LIC-003', 'offline', 203, 4.9, 620000.00, 6.4312, 3.4190);

-- 5. Initial Sales Reps
INSERT INTO public.sales_reps (name, email, phone, address, orders_handled, status)
VALUES
  ('Adaeze Okonkwo', 'ada@brybos.com', '08011223344', 'Lagos, Nigeria', 312, 'active'),
  ('Tunde Bakare', 'tunde@brybos.com', '08022334455', 'Abuja, Nigeria', 187, 'active');
