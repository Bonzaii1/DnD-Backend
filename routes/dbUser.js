const express = require('express')
const db = require('../lib/db')

const { OAuth2Client } = require('google-auth-library')


const userRouter = express.Router();

//User Routes
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)


// User Auth Route
userRouter.post('/auth', async (req, res) => {
    const { credential } = req.body

    if (!credential) return res.status(400).json({ error: 'Missing Credential' })

    try {
        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        })
        const role = 'Pathfinder'
        const payload = ticket.getPayload()

        const { rows } = await db.query(
            `insert into public."User"
                    (google_sub, fname, lname, email, role, active, picture, "churchId", "areaId")
                    values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    on conflict ("google_sub") do update set
                        fname = excluded.fname,
                        lname = excluded.lname,
                        email = excluded.email,
                        picture = excluded.picture,
                        updated_at = NOW()
                    returning *`,
            [payload.sub, payload.given_name, payload.family_name, payload.email, role, 1, payload.picture, 1, 1]
        )


        res.status(200).json({ result: "Success", fname: payload.given_name, lname: payload.family_name, email: payload.email, picture: payload.picture })


    } catch (err) {
        res.status(401).json({ result: "There was an Internal Error", error_message: err })
    }

})

module.exports = userRouter

