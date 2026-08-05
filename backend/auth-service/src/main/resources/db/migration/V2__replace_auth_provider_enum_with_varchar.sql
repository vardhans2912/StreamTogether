-- 1. Drop the composite unique constraint
ALTER TABLE users
DROP INDEX auth_provider;

-- 2. Modify auth_provider from ENUM → VARCHAR
ALTER TABLE users
MODIFY auth_provider VARCHAR(20) NOT NULL;

-- 3. Recreate the composite unique constraint
ALTER TABLE users
ADD CONSTRAINT uq_auth_provider_user
UNIQUE (auth_provider, provider_user_id);