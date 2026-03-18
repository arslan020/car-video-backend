import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

/**
 * Upload video file to Cloudflare Stream
 * @param {string} filePath - Path to the video file
 * @param {object} metadata - Optional metadata (title, etc.)
 * @returns {Promise<object>} - Cloudflare Stream video object
 */
import * as tus from 'tus-js-client';

/**
 * Upload video file to Cloudflare Stream using TUS (Resumable Upload)
 * @param {string} filePath - Path to the video file
 * @param {object} metadata - Optional metadata (title, etc.)
 * @returns {Promise<object>} - Cloudflare Stream video object
 */
export const uploadToCloudflareStream = async (filePath, metadata = {}) => {
    return new Promise((resolve, reject) => {
        try {
            const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
            const apiToken = process.env.CLOUDFLARE_API_TOKEN;

            if (!accountId || !apiToken) {
                throw new Error('Cloudflare Stream credentials not configured');
            }

            const fileSize = fs.statSync(filePath).size;
            const fileStream = fs.createReadStream(filePath);

            const upload = new tus.Upload(fileStream, {
                endpoint: `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream`,
                headers: {
                    Authorization: `Bearer ${apiToken}`,
                },
                chunkSize: 50 * 1024 * 1024, // 50MB chunks
                retryDelays: [0, 3000, 5000, 10000, 20000],
                metadata: {
                    name: metadata.title || 'Video Upload',
                    requiresignedurls: 'false',
                },
                uploadSize: fileSize,
                onError: (error) => {
                    console.error('Cloudflare TUS upload failed:', error);
                    reject(error);
                },
                onProgress: (bytesUploaded, bytesTotal) => {
                    const percentage = ((bytesUploaded / bytesTotal) * 100).toFixed(2);
                    console.log(`Cloudflare Upload Progress: ${percentage}%`);
                },
                onSuccess: async () => {
                    try {
                        // The upload URL contains the video ID at the end
                        // Example: https://api.cloudflare.com/client/v4/accounts/.../stream/<VIDEO_UID>
                        const uploadUrl = upload.url;
                        const videoId = uploadUrl.split('/').pop();

                        console.log('Cloudflare TUS upload successful, videoId:', videoId);

                        // Fetch video details to confirm and get thumbnail (might take a moment to be available)
                        // Use axios for this part as it's a simple GET
                        try {
                            // Wait a second for Cloudflare to process basic info
                            await new Promise(r => setTimeout(r, 1000));

                            // EXPLICITLY DISABLE SIGNED URLS requirement
                            await axios.post(
                                `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${videoId}`,
                                { requireSignedURLs: false },
                                { headers: { Authorization: `Bearer ${apiToken}` } }
                            );

                            const response = await axios.get(
                                `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${videoId}`,
                                { headers: { Authorization: `Bearer ${apiToken}` } }
                            );

                            const video = response.data.result;

                            resolve({
                                videoId: video.uid,
                                videoUrl: `https://${process.env.CLOUDFLARE_CUSTOMER_SUBDOMAIN}/${video.uid}/iframe`,
                                thumbnail: video.thumbnail,
                                duration: video.duration,
                                status: video.status.state
                            });

                        } catch (fetchError) {
                            // If fetching/updating details fails, still return the basic info we have
                            console.warn('Could not update/fetch video details after upload, returning basic info', fetchError.message);
                            resolve({
                                videoId: videoId,
                                videoUrl: `https://${process.env.CLOUDFLARE_CUSTOMER_SUBDOMAIN}/${videoId}/iframe`,
                                status: 'ready' // Assume ready or processing
                            });
                        }

                    } catch (error) {
                        reject(error);
                    }
                },
            });

            upload.start();

        } catch (error) {
            reject(error);
        }
    });
};

/**
 * Delete video from Cloudflare Stream
 * @param {string} videoId - Cloudflare Stream video ID
 * @returns {Promise<boolean>} - Success status
 */
export const deleteFromCloudflareStream = async (videoId) => {
    try {
        const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
        const apiToken = process.env.CLOUDFLARE_API_TOKEN;

        await axios.delete(
            `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${videoId}`,
            {
                headers: {
                    'Authorization': `Bearer ${apiToken}`
                }
            }
        );

        return true;
    } catch (error) {
        console.error('Cloudflare Stream delete error:', error.response?.data || error.message);
        return false;
    }
};
