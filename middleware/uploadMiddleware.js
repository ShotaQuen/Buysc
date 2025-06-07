const multer = require('multer');
const path = require('path');
const fs = require('fs');

const ensureUploadsDirExists = (directory) => {
    if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
    }
};

const scStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = 'uploads/sourcecodes/';
        ensureUploadsDirExists(dir);
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const screenshotStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = 'uploads/screenshots/';
        ensureUploadsDirExists(dir);
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    if (file.fieldname === "sc_file") {
        if (file.mimetype === 'application/zip' ||
            file.mimetype === 'application/x-zip-compressed' ||
            file.mimetype === 'application/octet-stream' ||
            file.mimetype.startsWith('text/')) { 
            cb(null, true);
        } else {
            req.fileValidationError = "Hanya file .zip atau .txt yang diizinkan untuk Source Code!";
            return cb(null, false, new Error("Hanya file .zip atau .txt yang diizinkan untuk Source Code!"));
        }
    } else if (file.fieldname === "screenshots") {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            req.fileValidationError = "Hanya file gambar yang diizinkan untuk Screenshot!";
            return cb(null, false, new Error("Hanya file gambar yang diizinkan untuk Screenshot!"));
        }
    } else {
        cb(null, false);
    }
};

const uploadScFile = multer({
    storage: scStorage,
    limits: { fileSize: 1024 * 1024 * 50 },
    fileFilter: fileFilter
}).single('sc_file');
const uploadScreenshots = multer({
    storage: screenshotStorage,
    limits: { fileSize: 1024 * 1024 * 5 }, 
    fileFilter: fileFilter
}).array('screenshots', 5); 
const uploadFields = multer({
    storage: multer.diskStorage({
        destination: function (req, file, cb) {
            let dir = 'uploads/others/'; 
            if (file.fieldname === "sc_file") {
                dir = 'uploads/sourcecodes/';
            } else if (file.fieldname === "screenshots") {
                dir = 'uploads/screenshots/';
            }
            ensureUploadsDirExists(dir);
            cb(null, dir);
        },
        filename: function (req, file, cb) {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
        }
    }),
    limits: {
        fileSize: {
            sc_file: 1024 * 1024 * 50, // 50MB
            screenshots: 1024 * 1024 * 5 // 5MB
        }
    },
    fileFilter: fileFilter
}).fields([
    { name: 'sc_file', maxCount: 1 },
    { name: 'screenshots', maxCount: 5 }
]);


module.exports = { uploadScFile, uploadScreenshots, uploadFields };