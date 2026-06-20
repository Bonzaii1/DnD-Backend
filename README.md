# DnD Google Backend

Simple Node.js Express backend for Google Drive and Google Sheets API calls.

## Setup

1. Copy `.env.example` to `.env`.
2. Fill the Google credentials:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REFRESH_TOKEN`
   - `GOOGLE_REDIRECT_URI`

## Install

```bash
npm install
```

## Run

```bash
npm start
```

## Testing

Tests run fully offline — no `.env` file or real Google/PostgreSQL credentials needed.

**Run all tests:**
```bash
npm test
```

**Watch mode:**
```bash
npm run test:watch
```

**Coverage report:**
```bash
npm test -- --coverage
```

Tests live in `__tests__/`:
- `routes.db.test.js` — covers all database CRUD routes (`/api/db/areas`, `/api/db/churches`)
- `routes.google.test.js` — covers all Google API routes (`/auth`, `/oauth2callback`, `/api/drive/*`, `/api/spreadsheets/*`)

External dependencies (`lib/db.js`, `lib/googleClient.js`, `googleapis`) are mocked via Jest module mocking so no real services are contacted. Each test file creates its own minimal Express app rather than importing `index.js`.

## Endpoints

- `GET /api/drive/files`
  - Query params:
    - `q` (optional): search query
    - `pageSize` (optional): number of files to return
    - `pageToken` (optional): next page token

- `POST /api/drive/upload`
  - Form data:
    - `file` (required): file to upload
    - `parentId` (optional): Google Drive folder ID to upload into
  - Returns: uploaded file metadata with id, name, mimeType, webViewLink, size

- `GET /api/spreadsheets/:spreadsheetId/values?range=Sheet1!A1:C10`
  - `spreadsheetId`: ID of the Google Sheet
  - `range`: optional A1 notation range

## Notes
- CORS is enabled so your frontend can call the API from a browser.

- Use `https://developers.google.com/oauthplayground` as the redirect URI when generating a refresh token.
- Your frontend can call these endpoints to keep Google credentials secure on the backend.
