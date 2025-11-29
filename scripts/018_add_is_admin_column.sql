-- Add is_admin column to merchants table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'merchants' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE merchants ADD COLUMN is_admin BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Update existing admin user
UPDATE merchants 
SET is_admin = true 
WHERE email = 'ighanghangodspower@gmail.com';

-- Update the trigger to include is_admin check
DROP FUNCTION IF EXISTS public.handle_new_merchant() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_merchant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.merchants (id, business_name, email, is_admin)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data ->> 'business_name', 'Untitled Business'),
    new.email,
    CASE WHEN new.email = 'ighanghangodspower@gmail.com' THEN true ELSE false END
  )
  ON CONFLICT (id) DO UPDATE SET
    is_admin = CASE WHEN EXCLUDED.email = 'ighanghangodspower@gmail.com' THEN true ELSE merchants.is_admin END;

  RETURN new;
END;
$$;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_merchant();
