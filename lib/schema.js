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
      id         SERIAL PRIMARY KEY,
      fname      TEXT NOT NULL,
      lname      TEXT,
      username   TEXT,
      password   TEXT,
      role       TEXT,
      active     INT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      "churchId" INT REFERENCES "Church"(id),
      "areaId"   INT REFERENCES "Area"(id)
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS "Requirements" (
      id              SERIAL PRIMARY KEY,
      "recordCard"    INT,
      "entranceEssay" INT,
      notes           INT,
      recommendations INT,
      "userId"        INT REFERENCES "User"(id)
    )
  `);

  console.log('Migrations complete');
}

module.exports = runMigrations;

