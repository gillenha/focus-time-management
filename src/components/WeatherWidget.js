import React, { useRef } from 'react';
import {
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudFog,
  Sun,
  CloudSun,
  ArrowClockwise,
} from '@phosphor-icons/react';
import useSpinAction from '../utils/useSpinAction';

const ICONS = {
  clear:        <Sun size={22} weight="fill" className="tw-text-yellow-300" />,
  partlyCloudy: <CloudSun size={22} weight="fill" className="tw-text-yellow-200" />,
  cloudy:       <Cloud size={22} weight="fill" className="tw-text-white" />,
  rain:         <CloudRain size={22} weight="fill" className="tw-text-blue-200" />,
  thunderstorm: <CloudLightning size={22} weight="fill" className="tw-text-yellow-300" />,
  snow:         <CloudSnow size={22} weight="fill" className="tw-text-blue-100" />,
  atmosphere:   <CloudFog size={22} weight="fill" className="tw-text-gray-300" />,
  empty:        <Cloud size={22} weight="regular" className="tw-text-white tw-opacity-60" />,
};

const WeatherWidget = ({ weatherData, onRefresh }) => {
  const isEmpty = !weatherData;
  const iconKey = isEmpty ? 'empty' : (weatherData.iconKey || 'cloudy');
  const cooldownRef = useRef(false);
  const [isSpinning, triggerSpin] = useSpinAction(
    () => (onRefresh ? onRefresh() : Promise.resolve()),
    1000
  );

  const handleRefresh = () => {
    if (cooldownRef.current || !onRefresh) return;
    cooldownRef.current = true;
    triggerSpin();
    setTimeout(() => { cooldownRef.current = false; }, 5000);
  };

  return (
    <div
      className="tw-flex tw-items-center tw-gap-4 tw-pl-2 tw-pr-4 tw-py-2 tw-group tw-cursor-pointer"
      onClick={handleRefresh}
      title="Refresh weather"
    >
      <div className="tw-flex tw-flex-col tw-gap-1 tw-bg-black/30 tw-rounded-lg tw-px-3 tw-py-2">
        <div className="tw-flex tw-items-center tw-gap-3 tw-flex-shrink-0 tw-self-start tw-mt-1">
          {ICONS[iconKey]}
          <span className="tw-text-white tw-text-2xl tw-font-bold tw-leading-none">
            {isEmpty ? `--°` : `${Math.round(weatherData.temp)}°`}
          </span>
          <span
            className={`tw-text-white tw-opacity-0 group-hover:tw-opacity-60 tw-transition-opacity tw-duration-200 ${isSpinning ? 'tw-opacity-60 tw-animate-spin' : ''}`}
          >
            <ArrowClockwise size={14} weight="bold" />
          </span>
        </div>

        <span className="tw-text-white tw-text-xs tw-opacity-75 tw-leading-tight">
          {isEmpty ? '---' : weatherData.city}
        </span>
      </div>
    </div>
  );
};

export default WeatherWidget;
