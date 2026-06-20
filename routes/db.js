const express = require('express');
const db = require('../lib/db')

const router = express.Router();

// DB routes go here

// Area Routes
router.get('/areas', async (req, res) => {

    try {
        const { rows } = await db.query('SELECT * FROM public."Area" ORDER BY id');
        res.json(rows)
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Database error', details: err.message })
    }
})

router.get('/areas/:areaId', async (req, res) => {
    const areaId = req.params.areaId;
    try {
        const { rows } = await db.query('SELECT * FROM public."Area" WHERE id = $1 ORDER BY id', [areaId])
        res.json(rows[0])
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Database error with method', details: err.message })
    }
})


// Church Routes
router.get('/churches', async (req, res) => {

    const churchId = req.query.churchId
    const areaId = req.query.areaId
    try {
        let result;
        if (churchId && areaId) result = await db.query('SELECT * FROM public."Church" WHERE id = $1 AND "areaId" = $2 ORDER BY id', [churchId, areaId])
        else if (churchId) result = await db.query('SELECT * FROM public."Church" WHERE id = $1 ORDER BY id', [churchId])
        else if (areaId) result = await db.query('SELECT * FROM public."Church" WHERE "areaId" = $1 ORDER BY id', [areaId])
        else result = await db.query('SELECT * FROM public."Church" ORDER BY id')
        res.json(result.rows)
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Database error', details: err.message })
    }
})

router.get('/churches/:churchId', async (req, res) => {
    const churchId = req.params.churchId;

    try {
        const { rows } = await db.query('SELECT * FROM public."Church" WHERE id = $1 ORDER BY id', [churchId])
        res.json(rows[0])
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Database error', details: err.message })
    }
})

module.exports = router;
