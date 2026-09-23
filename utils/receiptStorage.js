const multer = require('multer');

// Files are buffered in memory just long enough to hand off to Graph (see receiptDriveStorage.js) --
// nothing is ever written to local disk, since the SharePoint drive is the only persistent store.
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_FILE_SIZE } });

module.exports = { upload };
