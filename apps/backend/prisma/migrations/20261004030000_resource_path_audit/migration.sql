CREATE TABLE "resource_path_batches" (
  "id" VARCHAR(80) PRIMARY KEY,
  "completed_at" TIMESTAMPTZ(3),
  "rolled_back_at" TIMESTAMPTZ(3)
);
CREATE TABLE "resource_path_changes" (
  "batch_id" VARCHAR(80) NOT NULL REFERENCES "resource_path_batches"("id"),
  "kind" VARCHAR(20) NOT NULL,
  "resource_id" UUID NOT NULL,
  "old_slug" VARCHAR(160) NOT NULL,
  "new_slug" VARCHAR(8) NOT NULL,
  PRIMARY KEY ("batch_id", "kind", "resource_id"),
  UNIQUE ("batch_id", "kind", "new_slug")
);
CREATE TABLE "resource_reference_changes" (
  "batch_id" VARCHAR(80) NOT NULL REFERENCES "resource_path_batches"("id"),
  "record_key" VARCHAR(255) NOT NULL,
  "target" JSONB NOT NULL,
  "before_value" TEXT NOT NULL,
  "after_value" TEXT NOT NULL,
  PRIMARY KEY ("batch_id", "record_key")
);
