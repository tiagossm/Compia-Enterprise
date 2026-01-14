
-- Add action plan type to inspections
ALTER TABLE inspections ADD COLUMN action_plan_type TEXT DEFAULT '5w2h';

-- Create table for individual action items
CREATE TABLE action_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  inspection_id INTEGER NOT NULL,
  inspection_item_id INTEGER,
  title TEXT NOT NULL,
  what_description TEXT,
  where_location TEXT,
  why_reason TEXT,
  how_method TEXT,
  who_responsible TEXT,
  when_deadline DATE,
  how_much_cost TEXT,
  status TEXT DEFAULT 'pending',
  priority TEXT DEFAULT 'media',
  is_ai_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add pre-analysis field to inspection items
ALTER TABLE inspection_items ADD COLUMN ai_pre_analysis TEXT;
