-- Existing installations already enforce users_single_owner. Keep that owner's
-- ID, password and all authored content while pinning the only login identity.
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;
UPDATE "users" SET "email" = 'whoreahri@gmail.com';
ALTER TABLE "users" ADD CONSTRAINT "users_fixed_admin_email"
  CHECK ("email" = 'whoreahri@gmail.com');

CREATE TABLE "admin_sessions" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "csrf_token" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revoked_at" TIMESTAMPTZ(3),
  CONSTRAINT "admin_sessions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "admin_sessions_user_id_idx" ON "admin_sessions"("user_id");
ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- Legacy JWTs have no session ID and are rejected after this upgrade.
