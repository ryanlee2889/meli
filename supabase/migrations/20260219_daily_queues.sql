-- Daily Queues: one row per user per calendar day
CREATE TABLE IF NOT EXISTS daily_queues (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date         DATE        NOT NULL DEFAULT CURRENT_DATE,
  mood         TEXT,       -- hype | bright | chill | moody | mixed (set when completed)
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

-- Each track presented in a daily queue
CREATE TABLE IF NOT EXISTS daily_queue_items (
  id         UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id   UUID     NOT NULL REFERENCES daily_queues(id) ON DELETE CASCADE,
  item_id    UUID     NOT NULL REFERENCES items(id),
  position   INTEGER  NOT NULL,
  score      INTEGER  CHECK (score >= 1 AND score <= 10),
  skipped    BOOLEAN  NOT NULL DEFAULT false,
  rated_at   TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Generated playlist: subset of highly-rated tracks from the queue
CREATE TABLE IF NOT EXISTS daily_playlists (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id   UUID        NOT NULL REFERENCES daily_queues(id) ON DELETE CASCADE UNIQUE,
  user_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mood       TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tracks that made the cut (score >= 7)
CREATE TABLE IF NOT EXISTS daily_playlist_items (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID    NOT NULL REFERENCES daily_playlists(id) ON DELETE CASCADE,
  item_id     UUID    NOT NULL REFERENCES items(id),
  score       INTEGER NOT NULL,
  position    INTEGER NOT NULL
);

-- Row Level Security
ALTER TABLE daily_queues         ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_queue_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_playlists      ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_playlist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_daily_queues"
  ON daily_queues FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_own_daily_queue_items"
  ON daily_queue_items FOR ALL
  USING (EXISTS (
    SELECT 1 FROM daily_queues dq
    WHERE dq.id = queue_id AND dq.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM daily_queues dq
    WHERE dq.id = queue_id AND dq.user_id = auth.uid()
  ));

CREATE POLICY "users_own_daily_playlists"
  ON daily_playlists FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_own_daily_playlist_items"
  ON daily_playlist_items FOR ALL
  USING (EXISTS (
    SELECT 1 FROM daily_playlists dp
    WHERE dp.id = playlist_id AND dp.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM daily_playlists dp
    WHERE dp.id = playlist_id AND dp.user_id = auth.uid()
  ));
