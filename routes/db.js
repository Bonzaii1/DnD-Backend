const express = require('express');
const db = require('../lib/db')

const router = express.Router();

// DB routes go here

// Area Routes
router.get('/areas', (req, res) => {
    const rows = db.prepare('SELECT * FROM Area ORDER BY id').all();
    res.json(rows)
})

router.get('/areas/:areaId', (req, res) => {
    const areaId = req.params.areaId;

    const row = db.prepare("SELECT * FROM Area WHERE id = ? order by id").all(areaId)

    res.json(row)
})


// Church Routes
router.get('/churches', (req, res) => {

    const churchId = req.query.churchId
    const areaId = req.query.areaId

    let rows = null

    if (churchId && areaId) rows = db.prepare('SELECT * from Church WHERE id = ? AND areaId = ? ORDER BY id').all(churchId, areaId)
    else if (churchId) rows = db.prepare('SELECT * from Church WHERE id = ? ORDER BY id').all(churchId)
    else if (areaId) rows = db.prepare('SELECT * from Church WHERE areaId = ? ORDER BY id').all(areaId)
    else rows = db.prepare('SELECT * FROM Church order by id').all()


    res.json(rows)
})

router.get('/churches/:churchId', (req, res) => {
    const churchId = req.params.churchId;

    const row = db.prepare("SELECT * FROM Church WHERE id = ? order by id").all(churchId)

    res.json(row)
})

module.exports = router;
