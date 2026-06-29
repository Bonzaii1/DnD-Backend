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

        const payload = ticket.getPayload()

        console.log(payload)

        res.status(200).json({ status: "Success", token: "est" })

    } catch (err) {
        res.status(401).json({ error: 'Invalid Token' })
    }

})

module.exports = userRouter

