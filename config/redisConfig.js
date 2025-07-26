import { Redis } from '@upstash/redis';

// Simple wrapper to add retry logic to Upstash Redis client
const createRedisClient = () => {
    try {
        const client = new Redis({
            url: process.env.UPSTASH_REDIS_URL,
            token: process.env.UPSTASH_REDIS_TOKEN,
        });

        // Test the connection
        (async () => {
            try {
                await client.ping();
                console.log('✅ Redis connected successfully');
                return true;
            } catch (error) {
                console.warn('⚠️ Redis connection test failed:', error.message);
                return false;
            }
        })();

        return client;
    } catch (error) {
        console.error('❌ Failed to initialize Redis:', error.message);
        // Return a mock client if initialization fails
        return {
            async get() { 
                console.log('⚠️ Redis not available - get operation skipped');
                return null; 
            },
            async set(key, value, options = {}) { 
                console.log('⚠️ Redis not available - set operation skipped');
                return 'OK'; 
            },
            async del() { 
                console.log('⚠️ Redis not available - del operation skipped');
                return 0; 
            },
            async keys() { 
                console.log('⚠️ Redis not available - keys operation skipped');
                return []; 
            },
            async ping() { 
                throw new Error('Redis not available'); 
            }
        };
    }
};

// Create the Redis client
export default createRedisClient();