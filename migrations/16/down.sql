
ALTER TABLE users DROP COLUMN password_hash;
ALTER TABLE users DROP COLUMN email_verified_at;
ALTER TABLE users DROP COLUMN profile_completed;

DROP TABLE password_reset_tokens;
DROP TABLE email_verification_tokens;
