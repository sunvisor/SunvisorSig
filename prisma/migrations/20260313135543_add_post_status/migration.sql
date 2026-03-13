CREATE TYPE "PostStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE');

ALTER TABLE "Post"
ADD COLUMN "status" "PostStatus";
