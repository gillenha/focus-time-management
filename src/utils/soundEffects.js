// Effects play at a fixed volume independent of the user's volume slider so that
// confirmation sounds (bell, button clicks, session start/end) are always audible.
const EFFECT_VOLUME = 0.5;

// Pre-known effect files. Keep in sync with files dropped into /public/effects.
const EFFECT_FILES = [
    'bell.mp3',
    'enter-flow-state.mp3',
    'session-end.mp3',
    'play-pause.mp3',
    'next-track.mp3',
];

const getEffectUrl = (filename) => {
    if (process.env.NODE_ENV === 'development') {
        return `${process.env.REACT_APP_API_URL}/effects/${filename}`;
    }
    return `/effects/${filename}`;
};

// One pooled HTMLAudioElement per effect — fetched & decoded once, then reused.
// Reusing the element keeps playback latency tied to the click itself rather
// than to fetch/decode/GC work that snowballs over a long session.
const pool = new Map();

const getEffect = (filename) => {
    let audio = pool.get(filename);
    if (!audio) {
        audio = new Audio(getEffectUrl(filename));
        audio.preload = 'auto';
        audio.volume = EFFECT_VOLUME;
        audio.load();
        pool.set(filename, audio);
    }
    return audio;
};

// Call once at app start so the first click doesn't pay fetch/decode cost.
export const preloadEffects = () => {
    EFFECT_FILES.forEach(getEffect);
};

export const playEffect = (filename) => {
    try {
        const audio = getEffect(filename);
        audio.volume = EFFECT_VOLUME; // re-assert defensively
        audio.pause();
        audio.currentTime = 0;
        const result = audio.play();
        if (result && typeof result.catch === 'function') {
            result.catch((error) => {
                // AbortError is expected when a rapid second click interrupts
                // the previous play — not worth logging.
                if (error && error.name !== 'AbortError') {
                    console.error(`Error playing effect ${filename}:`, error);
                }
            });
        }
    } catch (error) {
        console.error(`Error playing effect ${filename}:`, error);
    }
};
