-- Enable RLS on payments table if not already enabled
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view their own payments
DROP POLICY IF EXISTS "Users can view their own payments" ON payments;
CREATE POLICY "Users can view their own payments" 
ON payments FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- Allow authenticated users to insert their own payments
DROP POLICY IF EXISTS "Users can insert their own payments" ON payments;
CREATE POLICY "Users can insert their own payments" 
ON payments FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to update their own payments (if needed)
DROP POLICY IF EXISTS "Users can update their own payments" ON payments;
CREATE POLICY "Users can update their own payments" 
ON payments FOR UPDATE
TO authenticated 
USING (auth.uid() = user_id);
