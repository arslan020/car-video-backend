import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

console.log("--- DIAGNOSTICS START ---");

console.log("Checking Environment Variables...");
console.log("CLOUDINARY_CLOUD_NAME:", process.env.CLOUDINARY_CLOUD_NAME ? "Set" : "Missing");
console.log("CLOUDINARY_API_KEY:", process.env.CLOUDINARY_API_KEY ? "Set" : "Missing");
console.log("CLOUDINARY_API_SECRET:", process.env.CLOUDINARY_API_SECRET ? "Set" : "Missing");

console.log("\nChecking Cloudinary Import...");
try {
    console.log("Cloudinary Type:", typeof cloudinary);
    console.log("Cloudinary Keys:", Object.keys(cloudinary || {}));

    if (!cloudinary || typeof cloudinary.config !== 'function') {
        throw new Error("Cloudinary v2 import failed or config is not a function");
    }

    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });
    console.log("Cloudinary Configured successfully.");
} catch (e) {
    console.error("Cloudinary Error:", e);
}

console.log("\nChecking Storage Initialization...");
try {
    const storage = new CloudinaryStorage({
        cloudinary: cloudinary,
        params: {
            folder: 'car-appraisals',
            resource_type: 'video',
        },
    });
    console.log("Storage Initialized successfully.");
} catch (e) {
    console.error("Storage Error:", e.message);
}

console.log("--- DIAGNOSTICS END ---");
