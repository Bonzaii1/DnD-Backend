require('dotenv').config()

const { Pool } = require('pg')

const pool = new Pool({ connectionString: process.env.DATABASE_URL });


module.exports = {
    async query(text, params) {
        const client = await pool.connect();

        try {
            return await client.query(text, params)
        } finally {
            client.release();
        }
    }
}