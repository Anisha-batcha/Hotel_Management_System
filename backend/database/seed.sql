-- Sample room data. Run this after schema.sql.
-- User accounts are NOT seeded here because passwords must be hashed with bcrypt
-- at runtime -- run `npm run seed` instead (see scripts/seed.js) once dependencies
-- are installed; it creates the admin and a demo user with real password hashes.
USE hotel_management;

INSERT INTO rooms (room_number, room_type, price_per_night, capacity, description, amenities, image_url, status) VALUES
('101', 'Deluxe', 4500.00, 2, 'A calm deluxe room with a city view and a queen bed.', 'Free WiFi, AC, TV, Mini Bar', '', 'available'),
('102', 'Deluxe', 4500.00, 2, 'A calm deluxe room with a garden view and a queen bed.', 'Free WiFi, AC, TV, Mini Bar', '', 'available'),
('201', 'Executive Suite', 8200.00, 3, 'A spacious suite with a separate living area.', 'Free WiFi, AC, TV, Mini Bar, Bathtub, Workspace', '', 'available'),
('202', 'Executive Suite', 8200.00, 3, 'A bright suite overlooking the pool.', 'Free WiFi, AC, TV, Mini Bar, Bathtub, Workspace', '', 'available'),
('301', 'Presidential Suite', 15000.00, 4, 'The hotel''s finest suite with a private balcony.', 'Free WiFi, AC, TV, Mini Bar, Bathtub, Butler Service', '', 'available'),
('103', 'Standard', 2800.00, 2, 'A comfortable standard room for short stays.', 'Free WiFi, AC, TV', '', 'available');
