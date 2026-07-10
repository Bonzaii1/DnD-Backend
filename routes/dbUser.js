const express = require('express')
const db = require('../lib/db')

const { OAuth2Client } = require('google-auth-library')


const userRouter = express.Router();

//User Routes
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)


// User Auth Route
userRouter.post('/auth', async (req, res) => {
    const { credential, signInKey } = req.body

    if (!credential) return res.status(400).json({ error: 'Missing Credential' })

    try {
        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        })
        const payload = ticket.getPayload()
        const { rows } = await db.query(
            `select "churchId", "areaId" from public."User" where google_sub = $1`,
            [payload.sub]
        )
        const userExists = rows.length > 0

        if (signInKey) {

            //console.log(signInKey)
            const { rows: rows_church } = await db.query(`SELECT id, "areaId" from public."Church" where signinkey = $1 and active = 1`, [signInKey])
            //console.log(rows_church)
            if (rows_church.length === 0) return res.status(400).json({ error: 'Invalid Sign in Key' })

            const churchId = rows_church[0].id
            const areaId = rows_church[0].areaId



            const role = 'Pathfinder'
            if (userExists) {
                return res.status(409).json({ error: 'User already exists' })
            } else {
                const { rows } = await db.query(
                    `insert into public."User"
                    (google_sub, fname, lname, email, role, active, picture, "churchId", "areaId")
                    values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                    [payload.sub, payload.given_name, payload.family_name, payload.email, role, 1, payload.picture, churchId, areaId]
                )


                res.status(200).json({ result: "Success", fname: payload.given_name, lname: payload.family_name, churchId: churchId, areaId: areaId, email: payload.email, picture: payload.picture })
            }



        } else {
            if (userExists) {
                const churchId = rows[0].churchId
                const areaId = rows[0].areaId
                res.status(200).json({ result: "Success", fname: payload.given_name, lname: payload.family_name, churchId: churchId, areaId: areaId, email: payload.email, picture: payload.picture })
            } else {
                res.status(409).json({ error: 'User does not exist please sign in with your sign in key' })
            }

        }



    } catch (err) {
        console.log(err)
        res.status(500).json({ result: "There was an Internal Error", error_message: err })
    }

})

module.exports = userRouter

