-- Rollback Migration 39: AI Rate Limiting and Gamification System

-- Drop tables
DROP TABLE IF EXISTS system_settings;
DROP TABLE IF EXISTS notification_preferences;
DROP TABLE IF EXISTS user_points_history;
DROP TABLE IF EXISTS ai_usage_log;

-- Drop triggers
DROP TRIGGER IF EXISTS update_user_level;
DROP TRIGGER IF EXISTS update_best_streak;

-- Remove columns from organizations
ALTER TABLE organizations DROP COLUMN ai_usage_count;
ALTER TABLE organizations DROP COLUMN ai_limit;
ALTER TABLE organizations DROP COLUMN ai_reset_date;
ALTER TABLE organizations DROP COLUMN subscription_tier;
ALTER TABLE organizations DROP COLUMN ai_model_preference;

-- Remove columns from users
ALTER TABLE users DROP COLUMN total_points;
ALTER TABLE users DROP COLUMN current_streak;
ALTER TABLE users DROP COLUMN best_streak;
ALTER TABLE users DROP COLUMN level;
ALTER TABLE users DROP COLUMN last_inspection_date;

-- Remove columns from kanban_cards
ALTER TABLE kanban_cards DROP COLUMN inspection_id;
ALTER TABLE kanban_cards DROP COLUMN assigned_by;
ALTER TABLE kanban_cards DROP COLUMN completed_on_time;
ALTER TABLE kanban_cards DROP COLUMN points_awarded;
