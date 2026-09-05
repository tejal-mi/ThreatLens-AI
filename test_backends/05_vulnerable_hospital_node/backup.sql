-- ThreatLens Hospital Database Dump
-- Host: internal-med-db.threatlens.local Database: hospital_production
-- Dump Date: 2026-08-18

DROP TABLE IF EXISTS "staff";
CREATE TABLE "staff" ("id" int, "username" varchar(50), "password_hash" varchar(255), "role" varchar(20));
INSERT INTO "staff" VALUES (1, 'chief_doctor', 'md5_5f4dcc3b5aa765d61d8327deb882cf99', 'admin');
INSERT INTO "staff" VALUES (2, 'nurse_mary', 'md5_e10adc3949ba59abbe56e057f20f883e', 'nurse');

DROP TABLE IF EXISTS "api_credentials";
CREATE TABLE "api_credentials" ("service" varchar(50), "api_key" varchar(255));
INSERT INTO "api_credentials" VALUES ('EPIC_EMR_INTEGRATION', 'epic_live_sec_key_998877665544332211');
