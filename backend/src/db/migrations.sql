CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY,
  player_x TEXT NOT NULL,
  player_o TEXT NOT NULL,
  winner TEXT,
  status TEXT NOT NULL,
  started_at TIMESTAMP NOT NULL,
  finished_at TIMESTAMP NOT NULL
);