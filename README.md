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
