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
                    // In development, use local manifest
                    const response = await fetch(`${apiUrl}/mp3s/manifest.json`);
                    if (!response.ok) {
                        throw new Error('Failed to fetch audio manifest');
                    }
                    const audioFiles = await response.json();
                    
                    // Validate development paths
                    const isLocalPath = audioFiles.every(path => path.startsWith('/mp3s/'));
                    if (!isLocalPath) {
                        throw new Error('Invalid paths for development environment');
                    }
                    
                    // Cache the result
                    this.manifestCache = audioFiles;
                    console.log('Development: Using local files:', audioFiles);
                    return audioFiles;
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
        
        // Development environment
        if (process.env.NODE_ENV === 'development') {
            if (relativePath.startsWith('https://')) {
                const filename = relativePath.split('/').pop();
                relativePath = `/mp3s/${filename}`;
            }
            
            // Ensure the path starts with /mp3s
            const localPath = relativePath.startsWith('/mp3s') 
                ? relativePath 
                : `/mp3s/${relativePath}`;
                
            const fullUrl = `http://localhost:3001${localPath}`;
            console.log('Development URL:', fullUrl);
            return fullUrl;
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
        return `${process.env.REACT_APP_API_URL}/${cleanPath}`;
    }

    static getBellAudioUrl() {
        console.log('Getting bell sound URL in environment:', process.env.NODE_ENV);
        if (process.env.NODE_ENV === 'development') {
            return 'http://localhost:3001/effects/bell.mp3';
        }
        // In production, the file will be served from the static build
        const url = '/effects/bell.mp3';
        console.log('Production bell URL:', url);
        return url;
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