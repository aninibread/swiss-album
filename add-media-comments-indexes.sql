-- Add indexes for media comments to improve query performance
CREATE INDEX idx_media_comments_media_id ON media_comments(media_id);
CREATE INDEX idx_media_comments_created_at ON media_comments(created_at);
CREATE INDEX idx_media_comments_user_id ON media_comments(user_id);