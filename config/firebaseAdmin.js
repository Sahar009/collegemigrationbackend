import admin from 'firebase-admin';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const initializeFirebaseAdmin = async () => {
    try {
        if (!admin.apps.length) {
            const serviceAccountPath = join(__dirname, '..', 'serviceAccountKey.json');
            const serviceAccount = JSON.parse(
                await readFile(serviceAccountPath, 'utf-8')
            );

            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        }
    } catch (error) {
        console.error('Firebase Admin initialization error:', error);
        throw error;
    }
};

await initializeFirebaseAdmin();

export default admin;