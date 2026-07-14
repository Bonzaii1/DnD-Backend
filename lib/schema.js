require('dotenv').config();
const db = require('./db')


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
      id         SERIAL PRIMARY KEY,
      name       TEXT NOT NULL,
      cname      TEXT,
      active     INT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      "areaId"   INT REFERENCES "Area"(id)
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
      prev_boot_camp_flag       INT default 0,
      prev_boot_camp_cert       TEXT,
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
  //   CREATE TABLE IF NOT EXISTS "Requirements" (
  //     id              SERIAL PRIMARY KEY,
  //     "recordCard"    INT,
  //     "entranceEssay" INT,
  //     notes           INT,
  //     recommendations INT,
  //     "userId"        INT UNIQUE REFERENCES "User"(id),
  //     req_created_at  TIMESTAMPTZ DEFAULT NOW(),
  //     req_updated_at  TIMESTAMPTZ DEFAULT NOW()
  //   )
  // `);

  console.log('Migrations complete');
}

module.exports = runMigrations;

