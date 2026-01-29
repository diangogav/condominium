-- =====================================================
-- Seed Data: Buildings
-- =====================================================
-- Insert sample buildings for testing and initial setup

INSERT INTO public.buildings (name, address) VALUES
    ('Torre A', 'Av. Principal #123, Caracas'),
    ('Torre B', 'Av. Principal #125, Caracas'),
    ('Edificio Central', 'Calle 5 con Av. 2, Valencia')
ON CONFLICT DO NOTHING;
