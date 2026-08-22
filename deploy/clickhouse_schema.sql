CREATE TABLE IF NOT EXISTS cinemind_events (
  event_time DateTime64(3, 'UTC'),
  event_id String,
  viewer_id String,
  universe_id String,
  title_id String,
  event_type LowCardinality(String),
  payload_json String
) ENGINE = MergeTree ORDER BY (viewer_id, universe_id, event_time, event_id);

CREATE TABLE IF NOT EXISTS cinemind_canon_facts (
  observed_at DateTime64(3, 'UTC'),
  universe_id String,
  title_id String,
  canon_version String,
  fact String,
  source LowCardinality(String)
) ENGINE = ReplacingMergeTree ORDER BY (universe_id, title_id, fact);

CREATE TABLE IF NOT EXISTS cinemind_taste_signals (
  observed_at DateTime64(3, 'UTC'),
  viewer_id String,
  signal_type LowCardinality(String),
  signal_key String,
  signal_value Float64,
  context_json String
) ENGINE = MergeTree ORDER BY (viewer_id, observed_at, signal_type, signal_key);
