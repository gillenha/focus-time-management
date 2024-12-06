import React, { useState, useCallback, useEffect } from 'react';
import './MusicPlayer.css';
import ControlBar from './ControlBar';
import SessionInput from './SessionInput';
import AudioManager from '../utils/audioManager';

const FOCUS_QUOTES = [
  '"The successful warrior is the average man, with laser-like focus." - Bruce Lee',
  '"Concentrate all your thoughts upon the work at hand. The sun\'s rays do not burn until brought to a focus." - Alexander Graham Bell',
  '"Where focus goes, energy flows." - Tony Robbins',
  '"The hours don\'t suddenly appear. You have to steal them from comfort." - Derek Sivers',
  '"You should have, at most, two primary goals or tasks per day." - Tim Ferriss',
  '"Earn with your mind, not your time." - Naval',
  '"You can do anything, but you can\'t do everything. This is a hard lesson to learn in life. But the beauty of this is you don\'t have to do everything." - Shaan Puri',
  '"When you think about focusing, you think focusing is saying “yes.” No — focusing is about saying "No." And you\'ve got to say no, no, no. - Steve Jobs',
  '"If you know something\'s going to work, it\'s not worth working on. It requires no courage. It requires no faith. It requires no skin in the game." - Eliot Peper',
  '"Instead of trying to be someone that you are not, be the best at what you are." - Thomas Sowell',
  '"On the highest or peaceful level, based upon the feelings of courage, acceptance, and love, our ability to concentrate is at its highest." - David Hawkins',
  '"I want to be thoroughly used up when I die, for the harder I work the more I live." - George Bernard Shaw',
  '"Outsized returns often come from betting against conventional wisdom, and conventional wisdom is usually right. Given a 10 percent chance of a 100 times payoff, you should take that bet every time." - Jeff Bezos',
  '"The most dangerous way to lose time is not to spend it having fun, but to spend it doing fake work." - Paul Graham',
  '"The point is to stay in the game, to keep the game going. Most of the games worth playing are infinite games, not finite games, which means the point is to just play." - Alex Hormozi',
  '"It\'s better to have an OK playbook that leans into your strengths than a great playbook that leans into your weaknesses." - George Mack',
  '"What\'s one small step you could take in the next twenty-four hours that would improve the chances of parenting getting just a little bit better?" - Britta Bushnell',
  '"Aim for genuine, not perfect." - Britta Bushnell',
  '"With easy access to "answers," we spend less time hanging out with uncertainty and ambiguity. We have become wary of wonder and its partner, curiosity." - Britta Bushnell',
  '"Habit is necessary; but it is the habit of having careless habits, of turning a trail into a rut, that must be incessantly fought against if one is to remain alive." - Edith Wharton',
  '"Are You Hunting Antelope or Field Mice?" - James Carville',
  '"The first step to getting all you want in the world is allowing yourself to want it — and facing the fears necessary to be able to get what you want." -Noah Kagan',
  '"I leave this life with no regrets. It was a wonderful life — full and complete with the great loves and great endeavors that make it worth living. I am sad to leave, but I leave with the knowledge that I lived the life that I intended." - Charles Krauthammer'
];

const QUOTE_ROTATION_INTERVAL = 15 * 60 * 1000; // 15 minutes in milliseconds

function MusicPlayer({ 
  isFreeflow, 
  onBeginClick, 
  stopAudio, 
  setTimerActive, 
  volume, 
  onVolumeChange,
  playlistTracks,
  sessionInputValue,
  setSessionInputValue,
  sessionStarted,
  setSessionStarted
}) {
  const [isAudioVerified, setIsAudioVerified] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [slideIn, setSlideIn] = useState(sessionStarted);
  const [currentQuote, setCurrentQuote] = useState(
    FOCUS_QUOTES[Math.floor(Math.random() * FOCUS_QUOTES.length)]
  );
  const [showQuote, setShowQuote] = useState(false);
  const [showControls, setShowControls] = useState(false);

  useEffect(() => {
    if (sessionStarted) {
      verifyAudio();
      
      const controlsTimer = setTimeout(() => {
        setShowControls(true);
      }, 1000); // 1 second delay
      
      return () => clearTimeout(controlsTimer);
    } else {
      setShowControls(false);
    }
  }, [sessionStarted]);

  useEffect(() => {
    if (!sessionStarted) return;

    const rotateQuote = () => {
      setCurrentQuote(prevQuote => {
        const currentIndex = FOCUS_QUOTES.indexOf(prevQuote);
        const nextIndex = (currentIndex + 1) % FOCUS_QUOTES.length;
        return FOCUS_QUOTES[nextIndex];
      });
    };

    const quoteInterval = setInterval(rotateQuote, QUOTE_ROTATION_INTERVAL);
    return () => clearInterval(quoteInterval);
  }, [sessionStarted]);

  useEffect(() => {
    if (sessionStarted) {
      const timer = setTimeout(() => {
        setShowQuote(true);
      }, 5000); // 5 second delay
      return () => clearTimeout(timer);
    } else {
      setShowQuote(false);
    }
  }, [sessionStarted]);

  const verifyAudio = async () => {
    if (playlistTracks.length === 0) {
      console.error('No tracks available to play');
      setIsAudioVerified(false);
      return false;
    }

    try {
      const audioPath = process.env.NODE_ENV === 'production'
        ? playlistTracks[0].fileName
        : `/mp3s/${playlistTracks[0].fileName}`;
      
      console.log('Verifying first track:', audioPath);
      const fullUrl = AudioManager.getFullAudioUrl(audioPath);
      const isValid = await AudioManager.verifyAudio(fullUrl);
      
      if (!isValid) {
        console.error('Audio verification failed. Please check if the audio files are available in the correct location.');
        if (process.env.NODE_ENV === 'development') {
          console.info('Development mode: Make sure your audio files are in the /mp3s directory and your development server is configured correctly.');
        }
      }
      
      setIsAudioVerified(isValid);
      return isValid;
    } catch (error) {
      console.error('Audio verification failed:', error);
      setIsAudioVerified(false);
      return false;
    }
  };

  const handleBeginSession = async () => {
    console.log('Beginning session...');
    const audioVerified = await verifyAudio();
    
    if (!audioVerified) {
      console.error('Cannot start session: Audio verification failed');
      return;
    }

    try {
      const bellUrl = AudioManager.getBellAudioUrl();
      console.log('Verifying bell sound:', bellUrl);
      const isValid = await AudioManager.verifyAudio(bellUrl);
      
      if (isValid) {
        const audio = new Audio(bellUrl);
        await audio.play();
      } else {
        console.warn('Bell sound verification failed, continuing without bell sound');
      }
    } catch (error) {
      console.error('Bell sound failed:', error);
    }
    
    setSlideIn(true);
    setSessionStarted(true);
    onBeginClick(sessionInputValue);
  };

  const handleInputChange = (event) => {
    setSessionInputValue(event.target.value);
  };

  const handleTrackEnd = useCallback(() => {
    setCurrentTrackIndex(prevIndex => {
      return prevIndex >= playlistTracks.length - 1 ? 0 : prevIndex + 1;
    });
  }, [playlistTracks.length]);

  const handleCleanup = useCallback((cleanup) => {
    window.audioCleanup = cleanup;
  }, []);

  const getAudioFiles = useCallback(() => {
    return playlistTracks.map(track => 
      process.env.NODE_ENV === 'production'
        ? track.fileName
        : `/mp3s/${track.fileName}`
    );
  }, [playlistTracks]);

  return (
    <div className={`
      tw-relative tw-flex tw-flex-col tw-items-center tw-justify-center 
      tw-w-full tw-h-full
      ${isFreeflow ? 'tw-animate-fadeIn' : 'tw-animate-fadeOut'}
    `}>
      <div className="tw-bg-black/30 tw-backdrop-blur-md tw-rounded-xl tw-p-8 tw-flex tw-flex-col tw-items-center tw-gap-6 tw-w-[90%] tw-max-w-[384px] tw-h-[400px] tw-min-h-[400px] sm:tw-w-96 tw-overflow-hidden tw-relative">
        <p className={`
          tw-text-white tw-font-medium tw-text-2xl tw-absolute
          tw-left-1/2 tw-transform tw-transition-all tw-duration-500
          tw-ease-out tw--translate-x-1/2 tw-z-10
          ${slideIn ? 'tw-top-1/3 tw-scale-150 tw-opacity-100' : 'tw-top-0 tw-scale-100 tw-opacity-70'}
        `}>
          Time to focus
        </p>

        {!sessionStarted && (
          <SessionInput
            inputValue={sessionInputValue}
            onInputChange={handleInputChange}
            onBeginClick={handleBeginSession}
            fadeOut={slideIn}
          />
        )}

        {sessionStarted && (
          <>
            <p className={`
              tw-text-white/80 
              tw-text-sm 
              tw-mt-60 
              tw-italic
              tw-transition-opacity 
              tw-duration-1000
              ${showQuote ? 'tw-opacity-100' : 'tw-opacity-0'}
            `}>
              {currentQuote}
            </p>
            <div className={`
              tw-transition-opacity 
              tw-duration-1000
              ${showControls ? 'tw-opacity-100' : 'tw-opacity-0'}
            `}>
              <ControlBar
                setTimerActive={setTimerActive}
                volume={volume}
                onVolumeChange={onVolumeChange}
                audioFiles={getAudioFiles()}
                onCleanup={handleCleanup}
                currentTrackIndex={currentTrackIndex}
                onTrackEnd={handleTrackEnd}
                isSequential={true}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default MusicPlayer;
