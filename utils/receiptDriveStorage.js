const path = require('path');
const crypto = require('crypto');
const { getGraphClient } = require('./graphClient');

const SITE_ID = process.env.SHAREPOINT_SITE_ID;
const LIBRARY_NAME = process.env.SHAREPOINT_RECEIPTS_LIBRARY_NAME || 'ExpenseReceipt';
// Explicit override, if set: skips the by-name lookup below entirely and pins to this drive.
const EXPLICIT_DRIVE_ID = process.env.SHAREPOINT_RECEIPTS_DRIVE_ID;

// Graph's simple "upload or replace content" endpoint is documented as reliable up to 4 MiB; larger
// files need a resumable upload session instead.
const SIMPLE_UPLOAD_MAX = 4 * 1024 * 1024;
// Each upload-session chunk must be a multiple of 320 KiB (Graph's documented requirement).
const CHUNK_SIZE = 320 * 1024 * 16; // 5 MiB

// Resolved once per process and cached -- avoids a "list drives" round trip on every upload.
let resolvedDriveId;

function assertConfigured() {
  if (!EXPLICIT_DRIVE_ID && !SITE_ID) {
    throw new Error(
      'SharePoint is not configured: set either SHAREPOINT_RECEIPTS_DRIVE_ID, or SHAREPOINT_SITE_ID ' +
      `(so the "${LIBRARY_NAME}" document library can be resolved by name)`
    );
  }
}

// Resolves the drive (document library) id to upload into. Preferring a name-based lookup over a
// hardcoded drive id guarantees receipts always land in the intended "ExpenseReceipt" library, even
// if that library gets recreated (and its underlying drive id changes) or someone else's drive id
// was pasted into config by mistake.
async function getDriveId(client) {
  if (EXPLICIT_DRIVE_ID) {
    return EXPLICIT_DRIVE_ID;
  }

  if (resolvedDriveId) {
    return resolvedDriveId;
  }

  const { value: drives } = await client.api(`/sites/${SITE_ID}/drives`).get();
  const match = drives.find((drive) => drive.name?.toLowerCase() === LIBRARY_NAME.toLowerCase());

  if (!match) {
    const available = drives.map((drive) => drive.name).join(', ');
    throw new Error(
      `Could not find a "${LIBRARY_NAME}" document library on site ${SITE_ID}. Available libraries: ${available}`
    );
  }

  resolvedDriveId = match.id;
  return resolvedDriveId;
}

// "<claim>/<original-name-sanitized>-<unique>.<ext>" -- Graph auto-creates any missing folders
// in the path (<claim>/...) when uploading by path, so nothing needs to be pre-created the way
// the old SPFx list/folder code had to. The library itself (resolved above) already scopes these
// to "ExpenseReceipt", so no extra root folder is needed inside it.
function buildDrivePath(expenseClaimId, originalName) {
  const ext = path.extname(originalName);
  const base = path.basename(originalName, ext).replace(/[^a-zA-Z0-9._-]/g, '_');
  const unique = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
  return `${expenseClaimId}/${base}-${unique}${ext}`;
}

async function uploadReceiptToDrive(expenseClaimId, file) {
  assertConfigured();

  const client = getGraphClient();
  const driveId = await getDriveId(client);
  const drivePath = buildDrivePath(expenseClaimId, file.originalname);
  const encodedPath = drivePath.split('/').map(encodeURIComponent).join('/');

  const driveItem = file.size <= SIMPLE_UPLOAD_MAX
    ? await client
      .api(`/drives/${driveId}/root:/${encodedPath}:/content`)
      .header('Content-Type', file.mimetype || 'application/octet-stream')
      .put(file.buffer)
    : await uploadLargeFile(client, driveId, encodedPath, file.buffer);

  return driveItem.id;
}

async function uploadLargeFile(client, driveId, encodedPath, buffer) {
  const session = await client.api(`/drives/${driveId}/root:/${encodedPath}:/createUploadSession`).post({});

  let start = 0;
  let lastResponseBody;

  while (start < buffer.length) {
    const end = Math.min(start + CHUNK_SIZE, buffer.length);
    const chunk = buffer.subarray(start, end);

    const response = await fetch(session.uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Length': String(chunk.length),
        'Content-Range': `bytes ${start}-${end - 1}/${buffer.length}`
      },
      body: chunk
    });

    if (!response.ok) {
      throw new Error(`Receipt upload session failed at byte ${start} (HTTP ${response.status})`);
    }

    lastResponseBody = await response.json();
    start = end;
  }

  return lastResponseBody;
}

async function streamReceiptFromDrive(driveItemId, res, fileName) {
  assertConfigured();

  const client = getGraphClient();
  const driveId = await getDriveId(client);
  const stream = await client.api(`/drives/${driveId}/items/${driveItemId}/content`).getStream();

  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
  stream.pipe(res);
}

async function deleteReceiptFromDrive(driveItemId) {
  assertConfigured();

  const client = getGraphClient();
  const driveId = await getDriveId(client);
  await client.api(`/drives/${driveId}/items/${driveItemId}`).delete();
}

module.exports = { uploadReceiptToDrive, streamReceiptFromDrive, deleteReceiptFromDrive };
