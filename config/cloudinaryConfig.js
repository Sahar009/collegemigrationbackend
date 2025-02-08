import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure storage
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'members', // The folder in cloudinary
        allowed_formats: ['jpg', 'jpeg', 'png', 'pdf'], // Allowed formats
        transformation: [{ width: 500, height: 500, crop: 'limit' }] // Image transformations
    }
});

export { cloudinary, storage }; 