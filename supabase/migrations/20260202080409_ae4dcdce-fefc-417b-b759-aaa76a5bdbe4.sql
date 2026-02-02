-- Create watch_parties table
CREATE TABLE public.watch_parties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  host_id UUID NOT NULL,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  party_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  playback_time NUMERIC NOT NULL DEFAULT 0,
  is_playing BOOLEAN NOT NULL DEFAULT false,
  max_participants INTEGER NOT NULL DEFAULT 8,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE
);

-- Create watch_party_participants table
CREATE TABLE public.watch_party_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  party_id UUID NOT NULL REFERENCES public.watch_parties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  left_at TIMESTAMP WITH TIME ZONE,
  last_ping_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(party_id, user_id)
);

-- Create watch_party_messages table
CREATE TABLE public.watch_party_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  party_id UUID NOT NULL REFERENCES public.watch_parties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_watch_parties_party_code ON public.watch_parties(party_code);
CREATE INDEX idx_watch_parties_status ON public.watch_parties(status);
CREATE INDEX idx_watch_party_participants_party_id ON public.watch_party_participants(party_id);
CREATE INDEX idx_watch_party_messages_party_id ON public.watch_party_messages(party_id);

-- Enable RLS
ALTER TABLE public.watch_parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_party_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_party_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for watch_parties
CREATE POLICY "Authenticated users can view active parties"
ON public.watch_parties FOR SELECT
USING (auth.uid() IS NOT NULL AND status = 'active');

CREATE POLICY "Authenticated users can create parties"
ON public.watch_parties FOR INSERT
WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Host can update their party"
ON public.watch_parties FOR UPDATE
USING (auth.uid() = host_id);

CREATE POLICY "Host can delete their party"
ON public.watch_parties FOR DELETE
USING (auth.uid() = host_id);

-- RLS Policies for watch_party_participants
CREATE POLICY "Users can view participants of parties they're in"
ON public.watch_party_participants FOR SELECT
USING (
  auth.uid() IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM public.watch_party_participants p 
    WHERE p.party_id = watch_party_participants.party_id 
    AND p.user_id = auth.uid() 
    AND p.left_at IS NULL
  )
);

CREATE POLICY "Users can join parties"
ON public.watch_party_participants FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own participation"
ON public.watch_party_participants FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Host can remove participants"
ON public.watch_party_participants FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.watch_parties wp 
    WHERE wp.id = watch_party_participants.party_id 
    AND wp.host_id = auth.uid()
  )
);

-- RLS Policies for watch_party_messages
CREATE POLICY "Participants can view messages"
ON public.watch_party_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.watch_party_participants p 
    WHERE p.party_id = watch_party_messages.party_id 
    AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Participants can send messages"
ON public.watch_party_messages FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.watch_party_participants p 
    WHERE p.party_id = watch_party_messages.party_id 
    AND p.user_id = auth.uid() 
    AND p.left_at IS NULL
  )
);

-- Enable realtime for all three tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.watch_parties;
ALTER PUBLICATION supabase_realtime ADD TABLE public.watch_party_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.watch_party_messages;