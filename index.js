const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();


const googleRoutes = require('./routes/google');
const dbRoutes = require('./routes/db');
const runMigrations = require('./lib/schema')

const { PORT = 3000 } = process.env;

const app = express();
app.use(cors({ origin: process.env.ALLOWED_ORIGIN }));
app.use(express.json());

app.get('/', (req, res) => {
    res.json({ message: 'DnD backend is running' });
});

app.get('/api', (req, res) => {
    res.json({
        message: 'API is available',
        routes: [
            'GET /api/drive/files',
            'POST /api/drive/upload',
            'GET /api/spreadsheets/:spreadsheetId/values',
        ],
    });
});

app.use(googleRoutes);
app.use('/api/db', dbRoutes);

app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});


runMigrations().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
});




