/*
  Warnings:

  - A unique constraint covering the columns `[commentId,originalFilename]` on the table `CommentAttachment` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[postId,originalFilename]` on the table `PostAttachment` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "CommentAttachment_commentId_originalFilename_key" ON "CommentAttachment"("commentId", "originalFilename");

-- CreateIndex
CREATE UNIQUE INDEX "PostAttachment_postId_originalFilename_key" ON "PostAttachment"("postId", "originalFilename");
