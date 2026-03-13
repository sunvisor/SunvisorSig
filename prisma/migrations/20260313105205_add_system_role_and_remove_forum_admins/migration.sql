CREATE TYPE "SystemRole" AS ENUM ('ADMIN', 'USER');

ALTER TABLE "User"
ADD COLUMN "systemRole" "SystemRole" NOT NULL DEFAULT 'USER';

UPDATE "User"
SET "systemRole" = 'ADMIN'
WHERE "id" IN (
  SELECT DISTINCT "userId"
  FROM "ForumMember"
  WHERE "role" = 'ADMIN'
);

UPDATE "ForumMember"
SET "role" = 'PARTICIPANT'
WHERE "role" = 'ADMIN';

UPDATE "Invitation"
SET "role" = 'PARTICIPANT'
WHERE "role" = 'ADMIN';

ALTER TYPE "ForumRole" RENAME TO "ForumRole_old";

CREATE TYPE "ForumRole" AS ENUM ('PARTICIPANT');

ALTER TABLE "ForumMember"
ALTER COLUMN "role" DROP DEFAULT;

ALTER TABLE "Invitation"
ALTER COLUMN "role" DROP DEFAULT;

ALTER TABLE "ForumMember"
ALTER COLUMN "role" TYPE "ForumRole"
USING ("role"::text::"ForumRole");

ALTER TABLE "Invitation"
ALTER COLUMN "role" TYPE "ForumRole"
USING ("role"::text::"ForumRole");

ALTER TABLE "ForumMember"
ALTER COLUMN "role" SET DEFAULT 'PARTICIPANT';

ALTER TABLE "Invitation"
ALTER COLUMN "role" SET DEFAULT 'PARTICIPANT';

DROP TYPE "ForumRole_old";
