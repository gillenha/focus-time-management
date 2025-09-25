class AudioManager {
    static manifestCache = null;
    static manifestPromise = null;

    static async getManifest() {
        // Return cached manifest if available
        if (this.manifestCache) {
            console.log('Using cached manifest');
            return this.manifestCache;
        }

        // If there's already a fetch in progress, return that promise
        if (this.manifestPromise) {
            console.log('Using existing manifest fetch');
            return this.manifestPromise;
        }

        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8080';
        console.log('Environment:', process.env.NODE_ENV);
        
        // Create new promise for manifest fetch
        this.manifestPromise = (async () => {
            try {
                if (process.env.NODE_ENV === 'production') {
                    // In production, fetch bucket contents directly
                    const response = await fetch('https://storage.googleapis.com/storage/v1/b/react-app-assets/o');
                    if (!response.ok) {
                        throw new Error('Failed to fetch bucket contents');
                    }
                    const data = await response.json();
                    
                    // Filter for mp3 files and extract names
                    const audioFiles = data.items
                        .filter(item => item.name.endsWith('.mp3'))
                        .map(item => item.name);
                    
                    // Cache the result
                    this.manifestCache = audioFiles;
                    console.log('Production: Loaded audio files from GCS:', audioFiles);
                    return audioFiles;
                    
                } else {
                    // In development, use GCP test folder
                    const response = await fetch(`${apiUrl}/api/files/list-tracks`);
                    if (!response.ok) {
                        throw new Error('Failed to fetch audio manifest');
                    }
                    const audioFiles = await response.json();
                    
                    // Extract file names from the items array
                    const trackNames = audioFiles.items.map(item => item.name);
                    
                    // Cache the result
                    this.manifestCache = trackNames;
                    console.log('Development: Using GCP test files:', trackNames);
                    return trackNames;
                }
                
            } catch (error) {
                console.error('Error in getManifest:', error);
                this.manifestPromise = null;
                throw error;
            }
        })();

        return this.manifestPromise;
    }

    static clearCache() {
        this.manifestCache = null;
        this.manifestPromise = null;
    }

    static getFullAudioUrl(relativePath) {
        console.log('Getting full audio URL for:', relativePath);
        
        // Remove any leading slashes and 'mp3s/'
        const filename = relativePath.split('/').pop();
        
        // Get the target folder based on environment
        const targetFolder = process.env.NODE_ENV === 'production' ? 'tracks' : 'test';
        
        // Always use GCP storage bucket URL
        const bucketUrl = `https://storage.googleapis.com/react-app-assets/${targetFolder}/${filename}`;
        console.log('Using bucket URL:', bucketUrl);
        return bucketUrl;
    }

    static getBellAudioUrl() {
        console.log('Getting bell sound URL in environment:', process.env.NODE_ENV);
        // Bell sound is still served from static files
        if (process.env.NODE_ENV === 'development') {
            return `${process.env.REACT_APP_API_URL}/effects/bell.mp3`;
        }
        return '/effects/bell.mp3';
    }

    static async verifyAudio(url) {
        console.log('Verifying audio URL:', url);
        try {
            // For Google Cloud Storage URLs
            if (url.includes('storage.googleapis.com')) {
                const response = await fetch(url, { 
                    method: 'HEAD',
                    headers: {
                        'Origin': window.location.origin
                    }
                });
                const isValid = response.ok;
                console.log('Audio verification result:', isValid ? 'success' : 'failed', 'Status:', response.status);
                if (!isValid) {
                    console.error('Audio file not found at:', url);
                }
                return isValid;
            } else {
                // For static files (like bell.mp3)
                const response = await fetch(url, { method: 'HEAD' });
                return response.ok;
            }
        } catch (error) {
            console.error('Audio verification failed:', error.message);
            return false;
        }
    }
}

export default AudioManager; 