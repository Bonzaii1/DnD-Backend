const mockGenerateAuthUrl = jest.fn().mockReturnValue('https://mock-auth-url');
const mockGetToken = jest.fn();
const MockOAuth2 = jest.fn().mockImplementation(() => ({
    generateAuthUrl: mockGenerateAuthUrl,
    getToken: mockGetToken,
}));

jest.mock('googleapis', () => ({
    google: { auth: { OAuth2: MockOAuth2 } },
}));

jest.mock('../lib/googleClient', () => ({
    drive: {
        files: {
            list: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
        },
    },
    sheets: {
        spreadsheets: {
            values: {
                get: jest.fn(),
            },
        },
    },
}));

const express = require('express');
const request = require('supertest');
const { drive, sheets } = require('../lib/googleClient');

beforeAll(() => {
    process.env.GOOGLE_CLIENT_ID = 'test-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
    process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000/oauth2callback';
});

const googleRoutes = require('../routes/google');

const app = express();
app.use(express.json());
app.use(googleRoutes);

describe('GET /auth', () => {
    it('redirects to the Google OAuth2 URL', async () => {
        const res = await request(app).get('/auth');

        expect(res.status).toBe(302);
        expect(res.headers.location).toBe('https://mock-auth-url');
        expect(mockGenerateAuthUrl).toHaveBeenCalledWith({
            access_type: 'offline',
            prompt: 'consent',
            scope: [
                'https://www.googleapis.com/auth/drive',
                'https://www.googleapis.com/auth/spreadsheets',
            ],
        });
    });
});

describe('GET /oauth2callback', () => {
    it('returns 400 when code query param is missing', async () => {
        const res = await request(app).get('/oauth2callback');

        expect(res.status).toBe(400);
        expect(res.text).toContain('Missing `code` query parameter');
    });

    it('returns 200 HTML with refresh_token instructions when getToken resolves with refresh_token', async () => {
        mockGetToken.mockResolvedValueOnce({
            tokens: { access_token: 'abc', refresh_token: 'xyz' },
        });

        const res = await request(app).get('/oauth2callback?code=valid-code');

        expect(res.status).toBe(200);
        expect(res.text).toContain('Copy this refresh_token');
        expect(res.text).toContain('xyz');
    });

    it('returns 200 HTML with no-refresh-token note when getToken returns no refresh_token', async () => {
        mockGetToken.mockResolvedValueOnce({
            tokens: { access_token: 'abc' },
        });

        const res = await request(app).get('/oauth2callback?code=valid-code');

        expect(res.status).toBe(200);
        expect(res.text).toContain('No refresh_token returned');
    });

    it('returns 500 when getToken rejects', async () => {
        mockGetToken.mockRejectedValueOnce(new Error('invalid_grant'));

        const res = await request(app).get('/oauth2callback?code=bad-code');

        expect(res.status).toBe(500);
        expect(res.text).toContain('Failed to exchange code for tokens');
    });
});

describe('GET /api/drive/files', () => {
    it('returns 200 with drive data on success', async () => {
        const mockData = { files: [{ id: '1', name: 'doc.pdf' }], nextPageToken: null };
        drive.files.list.mockResolvedValueOnce({ data: mockData });

        const res = await request(app).get('/api/drive/files');

        expect(res.status).toBe(200);
        expect(res.body).toEqual(mockData);
        expect(drive.files.list).toHaveBeenCalledWith(
            expect.objectContaining({ pageSize: 20 })
        );
    });

    it('passes q, pageSize, and pageToken query params to drive.files.list', async () => {
        drive.files.list.mockResolvedValueOnce({ data: { files: [] } });

        await request(app).get('/api/drive/files?q=test&pageSize=5&pageToken=tok123');

        expect(drive.files.list).toHaveBeenCalledWith(
            expect.objectContaining({ q: 'test', pageSize: 5, pageToken: 'tok123' })
        );
    });

    it('returns 500 with error details on drive failure', async () => {
        drive.files.list.mockRejectedValueOnce(new Error('quota exceeded'));

        const res = await request(app).get('/api/drive/files');

        expect(res.status).toBe(500);
        expect(res.body).toEqual({ error: 'Failed to list Drive files', details: 'quota exceeded' });
    });
});

describe('POST /api/drive/upload', () => {
    it('returns 400 when no file is attached', async () => {
        const res = await request(app).post('/api/drive/upload');

        expect(res.status).toBe(400);
        expect(res.body).toEqual({ error: 'No file provided' });
    });

    it('returns 200 with file metadata on successful upload', async () => {
        const mockFile = { id: 'file123', name: 'test.pdf', webViewLink: 'http://drive.google.com/...' };
        drive.files.create.mockResolvedValueOnce({ data: mockFile });

        const res = await request(app)
            .post('/api/drive/upload')
            .attach('file', Buffer.from('pdf content'), 'test.pdf');

        expect(res.status).toBe(200);
        expect(res.body.message).toBe('File uploaded successfully');
        expect(res.body.file).toEqual(mockFile);
        expect(drive.files.create).toHaveBeenCalledWith(
            expect.objectContaining({ resource: { name: 'test.pdf' } })
        );
    });

    it('resolves folderPath and uploads into the found folder', async () => {
        drive.files.list.mockResolvedValueOnce({ data: { files: [{ id: 'folder99' }] } });
        drive.files.create.mockResolvedValueOnce({ data: { id: 'file456', name: 'test.pdf' } });

        const res = await request(app)
            .post('/api/drive/upload')
            .field('folderPath', 'MyFolder')
            .attach('file', Buffer.from('content'), 'test.pdf');

        expect(res.status).toBe(200);
        expect(drive.files.create).toHaveBeenCalledWith(
            expect.objectContaining({ resource: { name: 'test.pdf', parents: ['folder99'] } })
        );
    });

    it('creates a new folder when folderPath segment is not found', async () => {
        drive.files.list.mockResolvedValueOnce({ data: { files: [] } });
        drive.files.create
            .mockResolvedValueOnce({ data: { id: 'newFolder' } })
            .mockResolvedValueOnce({ data: { id: 'fileABC', name: 'test.pdf' } });

        const res = await request(app)
            .post('/api/drive/upload')
            .field('folderPath', 'NewFolder')
            .attach('file', Buffer.from('content'), 'test.pdf');

        expect(res.status).toBe(200);
        expect(drive.files.create).toHaveBeenCalledTimes(2);
    });

    it('returns 500 on drive.files.create error', async () => {
        drive.files.create.mockRejectedValueOnce(new Error('storage full'));

        const res = await request(app)
            .post('/api/drive/upload')
            .attach('file', Buffer.from('content'), 'test.pdf');

        expect(res.status).toBe(500);
        expect(res.body).toEqual({ error: 'Failed to upload file', details: 'storage full' });
    });
});

describe('POST /api/drive/uploadPayload', () => {
    it('returns 200 with replaced: false when no existing file found', async () => {
        drive.files.list.mockResolvedValueOnce({ data: { files: [] } });
        drive.files.create.mockResolvedValueOnce({ data: { id: 'new1', name: 'recordCard_John_Doe.pdf' } });

        const res = await request(app)
            .post('/api/drive/uploadPayload')
            .field('fname', 'John')
            .field('lname', 'Doe')
            .attach('recordCard', Buffer.from('pdf'), 'card.pdf');

        expect(res.status).toBe(200);
        expect(res.body.message).toBe('Files uploaded successfully');
        expect(res.body.files[0].replaced).toBe(false);
        expect(res.body.files[0].fieldName).toBe('recordCard');
    });

    it('returns 200 with replaced: true and calls drive.files.update when existing file found', async () => {
        drive.files.list.mockResolvedValueOnce({ data: { files: [{ id: 'existing99' }] } });
        drive.files.update.mockResolvedValueOnce({ data: { id: 'existing99', name: 'recordCard_John_Doe.pdf' } });

        const res = await request(app)
            .post('/api/drive/uploadPayload')
            .field('fname', 'John')
            .field('lname', 'Doe')
            .attach('recordCard', Buffer.from('pdf'), 'card.pdf');

        expect(res.status).toBe(200);
        expect(res.body.files[0].replaced).toBe(true);
        expect(drive.files.update).toHaveBeenCalledWith(
            expect.objectContaining({ fileId: 'existing99' })
        );
    });

    it('returns 500 on drive error', async () => {
        drive.files.list.mockRejectedValueOnce(new Error('network error'));

        const res = await request(app)
            .post('/api/drive/uploadPayload')
            .field('fname', 'John')
            .field('lname', 'Doe')
            .attach('recordCard', Buffer.from('pdf'), 'card.pdf');

        expect(res.status).toBe(500);
        expect(res.body).toEqual(expect.objectContaining({ message: 'Failed to upload files' }));
    });
});

describe('GET /api/spreadsheets/:spreadsheetId/values', () => {
    it('returns 200 with spreadsheet data using default range Sheet1', async () => {
        const mockData = { values: [['A1', 'B1'], ['A2', 'B2']] };
        sheets.spreadsheets.values.get.mockResolvedValueOnce({ data: mockData });

        const res = await request(app).get('/api/spreadsheets/sheet123/values');

        expect(res.status).toBe(200);
        expect(res.body).toEqual(mockData);
        expect(sheets.spreadsheets.values.get).toHaveBeenCalledWith({
            spreadsheetId: 'sheet123',
            range: 'Sheet1',
        });
    });

    it('uses the provided range query param', async () => {
        sheets.spreadsheets.values.get.mockResolvedValueOnce({ data: { values: [] } });

        await request(app).get('/api/spreadsheets/sheet123/values?range=Sheet2!A1:B10');

        expect(sheets.spreadsheets.values.get).toHaveBeenCalledWith({
            spreadsheetId: 'sheet123',
            range: 'Sheet2!A1:B10',
        });
    });

    it('returns 500 on sheets API error', async () => {
        sheets.spreadsheets.values.get.mockRejectedValueOnce(new Error('not found'));

        const res = await request(app).get('/api/spreadsheets/sheet123/values');

        expect(res.status).toBe(500);
        expect(res.body).toEqual({ error: 'Failed to read spreadsheet values', details: 'not found' });
    });
});
