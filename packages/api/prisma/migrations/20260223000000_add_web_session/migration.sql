-- Migration: add WebSession table for CLI → Web auto-login

CREATE TABLE "WebSession" (
    "id"            TEXT NOT NULL,
    "sessionToken"  TEXT NOT NULL,
    "githubToken"   TEXT NOT NULL,
    "githubLogin"   TEXT NOT NULL,
    "githubAvatar"  TEXT NOT NULL DEFAULT '',
    "githubName"    TEXT NOT NULL DEFAULT '',
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt"     TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WebSession_sessionToken_key" ON "WebSession"("sessionToken");
CREATE INDEX "WebSession_githubLogin_idx" ON "WebSession"("githubLogin");
CREATE INDEX "WebSession_expiresAt_idx"   ON "WebSession"("expiresAt");
