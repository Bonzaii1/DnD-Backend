require('dotenv').config();
const db = require('./db')

/**
 * Database Schema Migration
 * 
 * Event Series Pattern:
 * - EventSeries: Represents a recurring event template (e.g., "Weekly Bible Study")
 * - Event: Individual occurrences of an event series with specific dates, locations, etc.
 * 
 * Example:
 * - EventSeries: "Youth Conference" (name, description, defaults)
 * - Event 1: "Youth Conference - Dallas" (Jan 15-17, Dallas Convention Center)
 * - Event 2: "Youth Conference - Austin" (Feb 20-22, Austin Church Hall)
 * - Event 3: "Youth Conference - Houston" (Mar 10-12, Houston Community Center)
 */


async function runMigrations() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS "Area" (
      id         SERIAL PRIMARY KEY,
      name       TEXT NOT NULL,
      sname      TEXT,
      active     INT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)

  await db.query(`
    CREATE TABLE IF NOT EXISTS "Church" (
      id              SERIAL PRIMARY KEY,
      name            TEXT NOT NULL,
      cname           TEXT,
      active          INT,
      created_at      TIMESTAMPTZ DEFAULT NOW(),
      updated_at      TIMESTAMPTZ DEFAULT NOW(),
      "areaId"        INT REFERENCES "Area"(id)
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS "User" (
      id                        SERIAL PRIMARY KEY,
      google_sub                TEXT UNIQUE,
      fname                     TEXT NOT NULL,
      lname                     TEXT,
      email                     TEXT,
      phone_number              TEXT,
      date_of_birth             TIMESTAMPTZ NULL,
      role                      TEXT,
      active                    INT DEFAULT 0,
      picture                   TEXT,
      created_at                TIMESTAMPTZ DEFAULT NOW(),
      updated_at                TIMESTAMPTZ DEFAULT NOW(),
      "churchId"                INT REFERENCES "Church"(id),
      "areaId"                  INT REFERENCES "Area"(id)
    )
  `);

  // await db.query(`
  //   CREATE TABLE IF NOT EXISTS "Role" (
  //     id          SERIAL PRIMARY KEY,
  //     name        TEXT NOT NULL,
  //     description TEXT,
  //     location    TEXT,
  //     capacity    INT,
  //     start_date  DATE,
  //     end_date    DATE,
  //     created_at  TIMESTAMPTZ DEFAULT NOW(),
  //     updated_at  TIMESTAMPTZ DEFAULT NOW()
  //   )
  // `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS "EventSeries" (
      id                  SERIAL PRIMARY KEY,
      name                TEXT NOT NULL,
      description         TEXT,
      default_location    TEXT,
      default_capacity    INT,
      active              INT DEFAULT 1,
      created_at          TIMESTAMPTZ DEFAULT NOW(),
      updated_at          TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS "Event" (
      id                SERIAL PRIMARY KEY,
      "eventSeriesId"   INT REFERENCES "EventSeries"(id) ON DELETE CASCADE,
      occurrence_name   TEXT,
      description       TEXT,
      location          TEXT,
      capacity          INT,
      start_date        DATE,
      end_date          DATE,
      active            INT DEFAULT 1,
      created_at        TIMESTAMPTZ DEFAULT NOW(),
      updated_at        TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Create indexes for better query performance
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_event_series_id ON "Event"("eventSeriesId")
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_event_start_date ON "Event"(start_date)
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_event_active ON "Event"(active)
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS "Registration" (
      id             SERIAL PRIMARY KEY,
      "userId"       INT REFERENCES "User"(id),
      "eventId"      INT REFERENCES "Event"(id),
      status         TEXT DEFAULT 'registered',
      registered_at  TIMESTAMPTZ DEFAULT NOW(),
      created_at     TIMESTAMPTZ DEFAULT NOW(),
      updated_at     TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE ("userId", "eventId")
    )
  `);

  // Certification System: Defines certification types and their requirements
  await db.query(`
    CREATE TABLE IF NOT EXISTS "CertificationType" (
      id           SERIAL PRIMARY KEY,
      name         TEXT NOT NULL UNIQUE,
      description  TEXT,
      active       INT DEFAULT 1,
      created_at   TIMESTAMPTZ DEFAULT NOW(),
      updated_at   TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS "CertificationRequirement" (
      id                    SERIAL PRIMARY KEY,
      "certificationTypeId" INT REFERENCES "CertificationType"(id) ON DELETE CASCADE,
      name                  TEXT NOT NULL,
      description           TEXT,
      required              BOOLEAN DEFAULT true,
      sort_order            INT DEFAULT 0,
      created_at            TIMESTAMPTZ DEFAULT NOW(),
      updated_at            TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS "UserCertification" (
      id                    SERIAL PRIMARY KEY,
      "userId"              INT REFERENCES "User"(id) ON DELETE CASCADE,
      "certificationTypeId" INT REFERENCES "CertificationType"(id) ON DELETE CASCADE,
      "eventId"             INT REFERENCES "Event"(id),
      status                TEXT DEFAULT 'in_progress',
      started_at            TIMESTAMPTZ DEFAULT NOW(),
      completed_at          TIMESTAMPTZ,
      verified_at           TIMESTAMPTZ,
      verified_by           INT REFERENCES "User"(id),
      notes                 TEXT,
      created_at            TIMESTAMPTZ DEFAULT NOW(),
      updated_at            TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE ("userId", "certificationTypeId")
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS "UserRequirementStatus" (
      id                          SERIAL PRIMARY KEY,
      "userCertificationId"       INT REFERENCES "UserCertification"(id) ON DELETE CASCADE,
      "certificationRequirementId" INT REFERENCES "CertificationRequirement"(id) ON DELETE CASCADE,
      status                      TEXT DEFAULT 'not_started',
      submitted_at                TIMESTAMPTZ,
      approved_at                 TIMESTAMPTZ,
      approved_by                 INT REFERENCES "User"(id),
      notes                       TEXT,
      file_url                    TEXT,
      created_at                  TIMESTAMPTZ DEFAULT NOW(),
      updated_at                  TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE ("userCertificationId", "certificationRequirementId")
    )
  `);

  // Create indexes for certification queries
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_cert_req_type ON "CertificationRequirement"("certificationTypeId")
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_user_cert_user ON "UserCertification"("userId")
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_user_cert_event ON "UserCertification"("eventId")
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_user_req_status_cert ON "UserRequirementStatus"("userCertificationId")
  `);

  console.log('Migrations complete');
}

module.exports = runMigrations;

