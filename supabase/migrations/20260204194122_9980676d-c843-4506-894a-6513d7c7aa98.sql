-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view their own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Anyone can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Anyone can update their own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Anyone can delete their own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Anyone can view messages from their conversations" ON public.messages;
DROP POLICY IF EXISTS "Anyone can create messages in their conversations" ON public.messages;

-- Create new policies that require authentication
CREATE POLICY "Users can view their own conversations" 
ON public.conversations FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own conversations" 
ON public.conversations FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations" 
ON public.conversations FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations" 
ON public.conversations FOR DELETE 
USING (auth.uid() = user_id);

-- Messages policies based on conversation ownership
CREATE POLICY "Users can view messages from their conversations" 
ON public.messages FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.conversations 
    WHERE id = conversation_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can create messages in their conversations" 
ON public.messages FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversations 
    WHERE id = conversation_id AND user_id = auth.uid()
  )
);

-- Make user_id NOT NULL for conversations
ALTER TABLE public.conversations ALTER COLUMN user_id SET NOT NULL;