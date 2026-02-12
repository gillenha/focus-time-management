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

        const apiUrl = process.env.REACT_APP_API_URL || 'http://devpigh.local:8082';
        console.log('Environment:', process.env.NODE_ENV);

        // Create new promise for manifest fetch
        this.manifestPromise = (async () => {
            try {
                const response = await fetch(`${apiUrl}/api/files/list-tracks`);
                if (!response.ok) {
                    throw new Error('Failed to fetch audio manifest');
                }
                const audioFiles = await response.json();

                // Extract file names from the items array
                const trackNames = audioFiles.items.map(item => item.name);

                // Cache the result
                this.manifestCache = trackNames;
                console.log('Loaded audio files from server:', trackNames);
                return trackNames;

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

        const apiUrl = process.env.REACT_APP_API_URL || 'http://devpigh.local:8082';

        // relativePath is like "test/song.mp3" or "tracks/song.mp3"
        // The server serves files at /uploads/
        const url = `${apiUrl}/uploads/${relativePath}`;
        console.log('Using server URL:', url);
        return url;
    }

    static getBellAudioUrl() {
        console.log('Getting bell sound URL in environment:', process.env.NODE_ENV);
        const apiUrl = process.env.REACT_APP_API_URL || 'http://devpigh.local:8082';
        return `${apiUrl}/effects/bell.mp3`;
    }

    static async verifyAudio(url) {
        console.log('Verifying audio URL:', url);
        try {
            const response = await fetch(url, { method: 'HEAD' });
            const isValid = response.ok;
            console.log('Audio verification result:', isValid ? 'success' : 'failed', 'Status:', response.status);
            if (!isValid) {
                console.error('Audio file not found at:', url);
            }
            return isValid;
        } catch (error) {
            console.error('Audio verification failed:', error.message);
            return false;
        }
    }
}

export default AudioManager;
