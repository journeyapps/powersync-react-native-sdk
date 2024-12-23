-- Presync List 
CREATE TABLE list (
   id uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
   text text NOT NULL,
   created_at timestamp with time zone DEFAULT current_timestamp
);

DO $$
DECLARE
   i INT;
   page INT := 1;
   current_timestamp TIMESTAMP := NOW();
BEGIN
   FOR i IN 1..10000 LOOP
      INSERT INTO list (text, created_at)
      VALUES ('item ' || i, current_timestamp + (i || ' milliseconds')::INTERVAL);
      IF i % 100 = 0 THEN page := page + 1; END IF;
   END LOOP;
END $$;

-- Paged List 
DROP TABLE IF EXISTS paged_list;

CREATE TABLE paged_list (
   id uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
   text text NOT NULL,
   page integer,
   created_at timestamp with time zone DEFAULT current_timestamp
);

DO $$
DECLARE
   i INT;
   page INT := 1;
   current_timestamp TIMESTAMP := NOW();
BEGIN
   FOR i IN 1..10000 LOOP
      INSERT INTO paged_list (text, page, created_at)
      VALUES ('item ' || i, page, current_timestamp + (i || ' milliseconds')::INTERVAL);
      IF i % 100 = 0 THEN page := page + 1; END IF;
   END LOOP;
END $$;

-- SyncTo List
CREATE TABLE syncto_list (
   id uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
   text text NOT NULL,
   sync_to uuid[] NOT NULL,
   created_at timestamp with time zone NOT NULL
);

DO $$
DECLARE
   i INT;
   page INT := 1;
   current_timestamp TIMESTAMP := NOW();
BEGIN
   FOR i IN 1..10000 LOOP
      INSERT INTO syncto_list (text, sync_to, created_at)
      VALUES ('item ' || i, ARRAY[]::UUID[], current_timestamp + (i || ' milliseconds')::INTERVAL);
      IF i % 100 = 0 THEN page := page + 1; END IF;
   END LOOP;
END $$;

CREATE OR REPLACE FUNCTION update_sync_to(start_value INT, end_value INT, user_uuid UUID)
RETURNS VOID AS $$
BEGIN
   -- Add the UUID to sync_to for the specified range of rows
   WITH ranked_rows AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS row_num
      FROM syncto_list
   )
   UPDATE syncto_list
   SET sync_to = CASE
      WHEN sync_to IS NULL THEN ARRAY[user_uuid]
      ELSE array_append(sync_to, user_uuid)
   END
   FROM ranked_rows
   WHERE syncto_list.id = ranked_rows.id
      AND ranked_rows.row_num BETWEEN start_value AND end_value;
END;
$$ LANGUAGE plpgsql;

-- Create Publication 
CREATE PUBLICATION powersync FOR ALL TABLES;