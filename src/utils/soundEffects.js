// Effects play at a fixed volume independent of the user's volume slider so that
// confirmation sounds (bell, button clicks, session start/end) are always audible.
const EFFECT_VOLUME = 0.5;

const getEffectUrl = (filename) => {
    if (process.env.NODE_ENV === 'development') {
        return `${process.env.REACT_APP_API_URL}/effects/${filename}`;
    }
    return `/effects/${filename}`;
};

export const playEffect = (filename) => {
    try {
        const audio = new Audio(getEffectUrl(filename));
        audio.volume = EFFECT_VOLUME;
        audio.play().catch((error) => {
            console.error(`Error playing effect ${filename}:`, error);
        });
    } catch (error) {
        console.error(`Error creating effect ${filename}:`, error);
    }
};
