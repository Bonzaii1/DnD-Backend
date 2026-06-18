const express = require('express');
const multer = require('multer');
const { google } = require('googleapis');
const { Readable } = require('stream');
const { drive, sheets } = require('../lib/googleClient');

const {
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI,
} = process.env;

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/auth', (req, res) => {
    const client = new google.auth.OAuth2(
        GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET,
        GOOGLE_REDIRECT_URI || 'http://localhost:3000/oauth2callback'
    );

    const url = client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: [
            'https://www.googleapis.com/auth/drive',
            'https://www.googleapis.com/auth/spreadsheets',
        ],
    });

    res.redirect(url);
});

router.get('/oauth2callback', async (req, res) => {
    const code = req.query.code;
    if (!code) {
        return res.status(400).send('Missing `code` query parameter');
    }

    try {
        const client = new google.auth.OAuth2(
            GOOGLE_CLIENT_ID,
            GOOGLE_CLIENT_SECRET,
            GOOGLE_REDIRECT_URI || 'http://localhost:3000/oauth2callback'
        );

        const { tokens } = await client.getToken(code);

        const refreshNote = tokens.refresh_token
            ? '<p><strong>Copy this refresh_token into your .env as GOOGLE_REFRESH_TOKEN</strong></p>'
            : '<p><em>No refresh_token returned. Try adding &prompt=consent to the auth URL and ensure access_type=offline.</em></p>';

        res.send(`
            <h1>OAuth2 Tokens</h1>
            ${refreshNote}
            <pre>${JSON.stringify(tokens, null, 2)}</pre>
        `);
    } catch (err) {
        console.error('Error exchanging code for tokens:', err);
        res.status(500).send('Failed to exchange code for tokens: ' + (err.message || err));
    }
});

router.get('/api/drive/files', async (req, res) => {
    try {
        const { q, pageSize = 20, pageToken } = req.query;
        const response = await drive.files.list({
            pageSize: Number(pageSize),
            q,
            pageToken,
            fields: 'nextPageToken, files(id, name, mimeType, webViewLink)',
        });

        res.json(response.data);
    } catch (error) {
        console.error('Drive list error:', error);
        res.status(500).json({ error: 'Failed to list Drive files', details: error.message });
    }
});

async function resolveFolderPath(folderPath, createIfMissing = true) {
    const segments = folderPath.split('/').filter(Boolean);
    let parentId = 'root';

    for (const segment of segments) {
        const q = `mimeType='application/vnd.google-apps.folder' and name='${segment.replace(/'/g, "\\'")}' and '${parentId}' in parents and trashed=false`;
        const result = await drive.files.list({ q, fields: 'files(id)', pageSize: 1 });
        const folders = result.data.files;

        if (folders.length > 0) {
            parentId = folders[0].id;
        } else if (createIfMissing) {
            const created = await drive.files.create({
                resource: { name: segment, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] },
                fields: 'id',
            });
            parentId = created.data.id;
        } else {
            throw new Error(`Folder not found: "${segment}" in path "${folderPath}"`);
        }
    }

    return parentId;
}

router.post('/api/drive/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file provided' });
        }

        const { originalname, mimetype, buffer } = req.file;
        let parentId = req.body.parentId || null;

        if (req.body.folderPath) {
            const createIfMissing = req.body.createIfMissing !== 'false';
            parentId = await resolveFolderPath(req.body.folderPath, createIfMissing);
        }

        const fileMetadata = { name: originalname };
        if (parentId) {
            fileMetadata.parents = [parentId];
        }

        const media = {
            mimeType: mimetype,
            body: Readable.from(buffer),
        };

        const response = await drive.files.create({
            resource: fileMetadata,
            media,
            fields: 'id, name, mimeType, webViewLink, size',
        });

        res.json({ message: 'File uploaded successfully', file: response.data });
    } catch (error) {
        console.error('Drive upload error:', error);
        res.status(500).json({ error: 'Failed to upload file', details: error.message });
    }
});

router.get('/api/spreadsheets/:spreadsheetId/values', async (req, res) => {
    try {
        const { spreadsheetId } = req.params;
        const range = req.query.range || 'Sheet1';

        const response = await sheets.spreadsheets.values.get({ spreadsheetId, range });

        res.json(response.data);
    } catch (error) {
        console.error('Sheets read error:', error);
        res.status(500).json({ error: 'Failed to read spreadsheet values', details: error.message });
    }
});

module.exports = router;
