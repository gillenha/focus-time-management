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

        const apiUrl = process.env.REACT_APP_API_URL;
        console.log('Environment:', process.env.NODE_ENV);
        
        // Create new promise for manifest fetch
        this.manifestPromise = (async () => {
            try {
                const response = await fetch(`${apiUrl}/mp3s/manifest.json`);
                if (!response.ok) {
                    throw new Error('Failed to fetch audio manifest');
                }
                const audioFiles = await response.json();
                
                // Validate paths based on environment
                if (process.env.NODE_ENV === 'development') {
                    const isLocalPath = audioFiles.every(path => path.startsWith('/mp3s/'));
                    if (!isLocalPath) {
                        throw new Error('Invalid paths for development environment');
                    }
                }
                
                // Cache the result
                this.manifestCache = audioFiles;
                console.log(`${process.env.NODE_ENV} environment - Manifest loaded:`, audioFiles);
                return audioFiles;
                
            } catch (error) {
                console.error('Error in getManifest:', error);
                // Clear the promise on error so it can be retried
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
        const apiUrl = process.env.REACT_APP_API_URL;
        
        // Development environment
        if (process.env.NODE_ENV === 'development') {
            if (relativePath.startsWith('https://')) {
                const filename = relativePath.split('/').pop();
                relativePath = `/mp3s/${filename}`;
            }
            
            const localPath = relativePath.startsWith('/mp3s') 
                ? relativePath 
                : `/mp3s/${relativePath}`;
                
            return `${apiUrl}${localPath}`;
        }
        
        // Production environment
        if (process.env.NODE_ENV === 'production') {
            if (relativePath.startsWith('http')) {
                return relativePath;
            }
            
            const filename = relativePath.split('/').pop();
            return `https://storage.googleapis.com/react-app-assets/${filename}`;
        }
        
        // Fallback
        const cleanPath = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
        return `${apiUrl}/${cleanPath}`;
    }

    static getBellAudioUrl() {
        const apiUrl = process.env.REACT_APP_API_URL;
        return `${apiUrl}/effects/bell.mp3`;
    }

    static async verifyAudio(url) {
        try {
            const response = await fetch(url);
            return response.ok;
        } catch (error) {
            console.error('Audio verification failed:', error);
            return false;
        }
    }
}

export default AudioManager; 