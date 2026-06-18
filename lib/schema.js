const db = require('./db')


db.exec(`
  CREATE TABLE IF NOT EXISTS Area (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    sname      TEXT,
    active     INT,
    created_at DATETIME DEFAULT (datetime('now')),
    updated_at DATETIME DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS Church (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    cname       TEXT,
    active      INT,
    created_at  DATETIME DEFAULT (datetime('now')),
    updated_at  DATETIME DEFAULT (datetime('now')),
    areaId      INT,
    FOREIGN KEY (areaId) REFERENCES Area(id)
  );

  CREATE TABLE IF NOT EXISTS User (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    fname       TEXT NOT NULL,
    lname       TEXT,
    username    TEXT,
    password    TEXT,
    role        TEXT,
    active      INT,
    created_at  DATETIME DEFAULT (datetime('now')),
    updated_at  DATETIME DEFAULT (datetime('now')),
    churchId    INT,
    areaId      INT,
    FOREIGN KEY (areaId) REFERENCES Area(id),
    FOREIGN KEY (churchId) REFERENCES Church(id)
  );

  CREATE TABLE IF NOT EXISTS Requirements (
    id INTEGER PRIMARY KEY AUTOINCREMENT
  );

`);


module.exports = db;