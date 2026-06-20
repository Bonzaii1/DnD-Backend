jest.mock('../lib/db');

const express = require('express');
const request = require('supertest');
const dbRoutes = require('../routes/db');
const db = require('../lib/db');

const app = express();
app.use(express.json());
app.use('/api/db', dbRoutes);

describe('GET /api/db/areas', () => {
    it('returns 200 with all areas on success', async () => {
        const mockRows = [{ id: 1, name: 'North' }, { id: 2, name: 'South' }];
        db.query.mockResolvedValueOnce({ rows: mockRows });

        const res = await request(app).get('/api/db/areas');

        expect(res.status).toBe(200);
        expect(res.body).toEqual(mockRows);
        expect(db.query).toHaveBeenCalledWith('SELECT * FROM public."Area" ORDER BY id');
    });

    it('returns 500 with error details on db failure', async () => {
        db.query.mockRejectedValueOnce(new Error('Connection refused'));

        const res = await request(app).get('/api/db/areas');

        expect(res.status).toBe(500);
        expect(res.body).toEqual({ error: 'Database error', details: 'Connection refused' });
    });
});

describe('GET /api/db/areas/:areaId', () => {
    it('returns 200 with single area object on success', async () => {
        const mockArea = { id: 7, name: 'East' };
        db.query.mockResolvedValueOnce({ rows: [mockArea] });

        const res = await request(app).get('/api/db/areas/7');

        expect(res.status).toBe(200);
        expect(res.body).toEqual(mockArea);
        expect(db.query).toHaveBeenCalledWith(
            'SELECT * FROM public."Area" WHERE id = $1 ORDER BY id',
            ['7']
        );
    });

    it('returns 200 with empty body when area not found', async () => {
        db.query.mockResolvedValueOnce({ rows: [] });

        const res = await request(app).get('/api/db/areas/999');

        expect(res.status).toBe(200);
        expect(res.text).toBe('');
    });

    it('returns 500 with error details on db failure', async () => {
        db.query.mockRejectedValueOnce(new Error('timeout'));

        const res = await request(app).get('/api/db/areas/1');

        expect(res.status).toBe(500);
        expect(res.body).toEqual({ error: 'Database error with method', details: 'timeout' });
    });
});

describe('GET /api/db/churches', () => {
    it('returns all churches when no query params provided', async () => {
        const mockRows = [{ id: 1, name: 'First Church' }];
        db.query.mockResolvedValueOnce({ rows: mockRows });

        const res = await request(app).get('/api/db/churches');

        expect(res.status).toBe(200);
        expect(res.body).toEqual(mockRows);
        expect(db.query).toHaveBeenCalledWith('SELECT * FROM public."Church" ORDER BY id');
    });

    it('filters by churchId only when only churchId is provided', async () => {
        db.query.mockResolvedValueOnce({ rows: [{ id: 3, name: 'Grace' }] });

        const res = await request(app).get('/api/db/churches?churchId=3');

        expect(res.status).toBe(200);
        expect(db.query).toHaveBeenCalledWith(
            'SELECT * FROM public."Church" WHERE id = $1 ORDER BY id',
            ['3']
        );
    });

    it('filters by areaId only when only areaId is provided', async () => {
        db.query.mockResolvedValueOnce({ rows: [{ id: 2, name: 'Hope' }] });

        const res = await request(app).get('/api/db/churches?areaId=2');

        expect(res.status).toBe(200);
        expect(db.query).toHaveBeenCalledWith(
            'SELECT * FROM public."Church" WHERE "areaId" = $1 ORDER BY id',
            ['2']
        );
    });

    it('filters by both churchId and areaId when both are provided', async () => {
        db.query.mockResolvedValueOnce({ rows: [{ id: 3, name: 'Grace' }] });

        const res = await request(app).get('/api/db/churches?churchId=3&areaId=2');

        expect(res.status).toBe(200);
        expect(db.query).toHaveBeenCalledWith(
            'SELECT * FROM public."Church" WHERE id = $1 AND "areaId" = $2 ORDER BY id',
            ['3', '2']
        );
    });

    it('returns 500 with error details on db failure', async () => {
        db.query.mockRejectedValueOnce(new Error('query failed'));

        const res = await request(app).get('/api/db/churches');

        expect(res.status).toBe(500);
        expect(res.body).toEqual({ error: 'Database error', details: 'query failed' });
    });
});

describe('GET /api/db/churches/:churchId', () => {
    it('returns 200 with single church object on success', async () => {
        const mockChurch = { id: 5, name: 'Grace Church' };
        db.query.mockResolvedValueOnce({ rows: [mockChurch] });

        const res = await request(app).get('/api/db/churches/5');

        expect(res.status).toBe(200);
        expect(res.body).toEqual(mockChurch);
        expect(db.query).toHaveBeenCalledWith(
            'SELECT * FROM public."Church" WHERE id = $1 ORDER BY id',
            ['5']
        );
    });

    it('returns 200 with empty body when church not found', async () => {
        db.query.mockResolvedValueOnce({ rows: [] });

        const res = await request(app).get('/api/db/churches/999');

        expect(res.status).toBe(200);
        expect(res.text).toBe('');
    });

    it('returns 500 with error details on db failure', async () => {
        db.query.mockRejectedValueOnce(new Error('db error'));

        const res = await request(app).get('/api/db/churches/1');

        expect(res.status).toBe(500);
        expect(res.body).toEqual({ error: 'Database error', details: 'db error' });
    });
});
