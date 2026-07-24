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
            `select * from public."User" where google_sub = $1`,
            [payload.sub]
        )
        const userExists = rows.length > 0

        if (signInKey) {

            const { rows: rows_church } = await db.query(`SELECT id, "areaId" from public."Church" where signinkey = $1 and active = 1`, [signInKey])
            if (rows_church.length === 0) return res.status(400).json({ error: 'Invalid Sign in Key' })

            const churchId = rows_church[0].id
            const areaId = rows_church[0].areaId

            const role = 'User'
            if (userExists) {
                return res.status(409).json({ error: 'User already exists' })
            } else {
                const { rows } = await db.query(
                    `insert into public."User"
                    (google_sub, fname, lname, email, role, active, picture, "churchId", "areaId")
                    values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    returning *`,
                    [payload.sub, payload.given_name, payload.family_name, payload.email, role, 0, payload.picture, churchId, areaId]
                )
                
                const data = rows[0]
                res.status(200).json({ 
                    id: data.id,
                    fname: data.fname, 
                    lname: data.lname, 
                    email: data.email, 
                    phone_number: data.phone_number,
                    date_of_birth: data.date_of_birth,
                    role: data.role,
                    active: data.active,
                    churchId: data.churchId, 
                    areaId: data.areaId, 
                    picture: data.picture, 
                    google_sub: data.google_sub 
                })
            }

        } else {
            if (userExists) {
                const data = rows[0]
                res.status(200).json({ 
                    id: data.id,
                    fname: data.fname, 
                    lname: data.lname, 
                    email: data.email, 
                    phone_number: data.phone_number, 
                    date_of_birth: data.date_of_birth, 
                    role: data.role,
                    active: data.active, 
                    churchId: data.churchId, 
                    areaId: data.areaId, 
                    picture: data.picture, 
                    google_sub: data.google_sub 
                })
            } else {
                res.status(409).json({ error: 'User does not exist please sign in with your sign in key' })
            }

        }

    } catch (err) {
        console.log(err)
        res.status(500).json({ error: "Internal server error", error_message: err.message })
    }

})

userRouter.post('/updateUser', async (req, res) => {

    const user = req.body

    if (!user || !user.google_sub) return res.status(400).json({ error: 'Missing User Object' });

    try {
        const { rows } = await db.query(
            `select "churchId", "areaId" from public."User" where google_sub = $1`,
            [user.google_sub]
        )
        const userExists = rows.length > 0

        if (userExists){
            const { rows } = await db.query(
                        `UPDATE public."User"
                        SET fname=$1, lname=$2, email=$3, phone_number=$4, date_of_birth=$5, role = $6, active=$7
                        WHERE google_sub = $8
                        returning *;`,
                        [user.fname, user.lname, user.email, user.phone_number, user.date_of_birth, user.role, 1, user.google_sub]
                    )
            const data = rows[0]
            res.status(200).json({ id: data.id, fname: data.fname, lname: data.lname, email: data.email, phone_number: data.phone_number, date_of_birth: data.date_of_birth, role: data.role, churchId: data.churchId, areaId: data.areaId, picture: data.picture, active: data.active, google_sub: data.google_sub })
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (err) {
        console.log(err)
        res.status(500).json({ error: "Internal server error", error_message: err.message })
    }
})


userRouter.get('/isRegistered/:userId', async (req, res) => {

    const userId = req.params.userId

    if (!userId) return res.status(400).json({ error: 'Missing UserID' });

    try{

        const {rows: eventRows} = await db.query(`
            select id from public."Event"
            where active = 1
            `)
        
        if (eventRows.length === 0) return res.status(400).json({ error: 'No active events up for Registration' });
        
        const eventId = eventRows[0].id

        const {rows: registrationRows} = await db.query(`
            SELECT status from public."Registration"
            WHERE "userId" = $1 and "eventId" = $2
            `, [userId, eventId])

        const hasRecords = registrationRows.length > 0

        if (hasRecords){
            return res.status(200).json({ isRegistered: true});
        }else{
            return res.status(200).json({ isRegistered: false});
        }
    }catch (err) {
        console.log(err)
        res.status(500).json({ error: "Internal server error: isRegistered", error_message: err.message })
    }

})





module.exports = userRouter

