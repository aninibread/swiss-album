import React, { useState, useRef } from 'react';

interface VideoContainerProps {
  src: string;
  className?: string;
  onError?: (e: React.SyntheticEvent<HTMLVideoElement, Event>) => void;
  onClick?: () => void;
  [key: string]: any;
}

export const VideoContainer: React.FC<VideoContainerProps> = ({ 
  src, 
  className, 
  onError, 
  onClick, 
  ...props 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);

  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    const ratio = video.videoWidth / video.videoHeight;
    setAspectRatio(ratio);
    props.onLoadedMetadata?.(e);
  };

  return (
    <div 
      style={{
        width: 'fit-content',
        maxWidth: '100%',
        aspectRatio: aspectRatio ? aspectRatio.toString() : undefined,
        margin: '0 auto'
      }}
    >
      <video
        ref={videoRef}
        src={src}
        className={className}
        onError={onError}
        onClick={onClick}
        onLoadedMetadata={handleLoadedMetadata}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain'
        }}
        {...props}
      />
    </div>
  );
};