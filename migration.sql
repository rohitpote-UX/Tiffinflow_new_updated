-- BITEBUDDY 2.0 DATA MIGRATION FROM SQLITE
-- Generated on 2026-08-30T00:37:14.230010
BEGIN;

INSERT INTO offices (id, name, admin_id, veg_price, non_veg_price, cutoff_time, week_start_day, auto_default_enabled, join_code, working_days)
VALUES ('df000f36-cdae-545f-a2c3-acb64b43b1c9', 'Default Office', 'system', 80, 100, '19:00', 1, TRUE, 'DEFAULT', '[1, 2, 3, 4, 5]'::jsonb)
ON CONFLICT (join_code) DO NOTHING;
INSERT INTO offices (id, name, admin_id, veg_price, non_veg_price, cutoff_time, week_start_day, auto_default_enabled, join_code, working_days)
VALUES ('e59c0689-5acb-5659-86bf-fe219bdf49fd', 'TechCorp Bangalore', 'f0219eef-e57a-4f81-a877-960333345468', 80, 100, '19:00', 1, TRUE, '50D5AE', '[1, 2, 3, 4, 5]'::jsonb)
ON CONFLICT (join_code) DO NOTHING;
INSERT INTO offices (id, name, admin_id, veg_price, non_veg_price, cutoff_time, week_start_day, auto_default_enabled, join_code, working_days)
VALUES ('5c793b02-f2ae-5eda-a5f4-0e99a24b4961', 'CNX Pune', '9537118f-4fd6-486b-9a09-afa881669dc8', 80, 100, '19:00', 1, TRUE, '4884C4', '[1, 2, 3, 4, 5]'::jsonb)
ON CONFLICT (join_code) DO NOTHING;

-- Users & Memberships
INSERT INTO users (id, name, email, phone, password_hash, is_active)
VALUES ('172e5efe-325f-4dcc-b5c7-c65610199da1', 'Test User', 'test@test.com', '+911234567890', '$2b$12$6OumDKhhFdovDX0jdDbzk.8ejp.kMH8gObGYLWlYfHxDDwWV9MDwi', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO memberships (user_id, office_id, role, default_preference, is_active)
VALUES ('172e5efe-325f-4dcc-b5c7-c65610199da1', 'df000f36-cdae-545f-a2c3-acb64b43b1c9', 'USER', 'flexible', TRUE)
ON CONFLICT (user_id, office_id) DO NOTHING;
INSERT INTO users (id, name, email, phone, password_hash, is_active)
VALUES ('f0219eef-e57a-4f81-a877-960333345468', 'Rohit Admin', 'admin@tiffinflow.com', '+919876543210', '$2b$12$GG1hVi06Oz9vt3u95UCy..sBflIP7ks5DtMv8YJsiSHXsNRuySKkK', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO memberships (user_id, office_id, role, default_preference, is_active)
VALUES ('f0219eef-e57a-4f81-a877-960333345468', 'e59c0689-5acb-5659-86bf-fe219bdf49fd', 'ADMIN', 'flexible', TRUE)
ON CONFLICT (user_id, office_id) DO NOTHING;
INSERT INTO users (id, name, email, phone, password_hash, is_active)
VALUES ('daa20b76-250d-4cfa-bcc8-5e32aac8fa71', 'Rohit Pote', 'crohitpote17@gmail.com', '+918390612060', '$2b$12$o/eI7OSwS.WNbjWgKJ2q8ejMta2PXqEqhLReUC/jC6.TIMBundkim', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO memberships (user_id, office_id, role, default_preference, is_active)
VALUES ('daa20b76-250d-4cfa-bcc8-5e32aac8fa71', 'df000f36-cdae-545f-a2c3-acb64b43b1c9', 'USER', 'flexible', TRUE)
ON CONFLICT (user_id, office_id) DO NOTHING;
INSERT INTO users (id, name, email, phone, password_hash, is_active)
VALUES ('9537118f-4fd6-486b-9a09-afa881669dc8', 'RM', 'rm@gmail.com', '+919764638326', '$2b$12$AzIup2rJxK9FblpfNYEO0OGaEfqaCi0H6onhKeKkuyjuEufNAWfzS', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO memberships (user_id, office_id, role, default_preference, is_active)
VALUES ('9537118f-4fd6-486b-9a09-afa881669dc8', '5c793b02-f2ae-5eda-a5f4-0e99a24b4961', 'ADMIN', 'flexible', TRUE)
ON CONFLICT (user_id, office_id) DO NOTHING;
INSERT INTO users (id, name, email, phone, password_hash, is_active)
VALUES ('e5036a6e-9db3-4e36-9604-e6dabc1ce16e', 'Rohit', 'crohit@gmail.com', '+918390612060', '$2b$12$88VSvXBlTVU6zbJarjLa4uigZpl5cob/8kz9N1WNdG9fPj7rIlxI2', TRUE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO memberships (user_id, office_id, role, default_preference, is_active)
VALUES ('e5036a6e-9db3-4e36-9604-e6dabc1ce16e', 'df000f36-cdae-545f-a2c3-acb64b43b1c9', 'USER', 'flexible', TRUE)
ON CONFLICT (user_id, office_id) DO NOTHING;

-- Meals
INSERT INTO meals (id, user_id, office_id, date, meal_type, status, price, is_auto_defaulted)
VALUES ('172e5efe-325f-4dcc-b5c7-c65610199da1_2026-05-30', '172e5efe-325f-4dcc-b5c7-c65610199da1', 'df000f36-cdae-545f-a2c3-acb64b43b1c9', '2026-05-30', 'veg', 'confirmed', 80, FALSE)
ON CONFLICT (id) DO NOTHING;
INSERT INTO meals (id, user_id, office_id, date, meal_type, status, price, is_auto_defaulted)
VALUES ('e5036a6e-9db3-4e36-9604-e6dabc1ce16e_2026-06-14', 'e5036a6e-9db3-4e36-9604-e6dabc1ce16e', 'df000f36-cdae-545f-a2c3-acb64b43b1c9', '2026-06-14', 'veg', 'confirmed', 80, FALSE)
ON CONFLICT (id) DO NOTHING;

-- Payments

COMMIT;