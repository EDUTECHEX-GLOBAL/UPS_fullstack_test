// middleware/adminupload.js
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Create admin uploads directory if it doesn't exist
const adminUploadDir = 'uploads/admin/';
if (!fs.existsSync(adminUploadDir)) {
    fs.mkdirSync(adminUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Store admin-uploaded files separately
        cb(null, adminUploadDir);
    },
    filename: function (req, file, cb) {
        // Admin-specific filename format
        const timestamp = Date.now();
        const random = Math.round(Math.random() * 1E9);
        const applicationId = req.params.id || 'unknown';
        const originalName = path.parse(file.originalname).name.replace(/[^a-zA-Z0-9]/g, '_');
        const extension = path.extname(file.originalname);
        
        // Format: admin_appId_timestamp_random_originalname.ext
        const filename = `admin_${applicationId}_${timestamp}_${random}_${originalName}${extension}`;
        
        cb(null, filename);
    }
});

const fileFilter = (req, file, cb) => {
    // Allowed file types for admin uploads
    const allowedTypes = /pdf|doc|docx|jpg|jpeg|png|txt|csv|xlsx|xls/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb(new Error('Only PDF, DOC, DOCX, JPG, JPEG, PNG, TXT, CSV, Excel files are allowed'));
    }
};

const adminUpload = multer({
    storage: storage,
    limits: { 
        fileSize: 15 * 1024 * 1024, // 15MB limit for admin (higher than student)
        files: 5 // Max 5 files at once
    },
    fileFilter: fileFilter
});

export default adminUpload;