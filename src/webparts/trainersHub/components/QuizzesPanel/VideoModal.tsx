import * as React from 'react';
import { Dialog, DialogType, DialogFooter } from '@fluentui/react/lib/Dialog';
import { DefaultButton, PrimaryButton } from '@fluentui/react/lib/Button';
import { Icon } from '@fluentui/react/lib/Icon';
import styles from './QuizzesPanel.module.scss';

export interface IVideoModalProps {
  videoLabel: string;
  videoUrl: string;
  isOpen: boolean;
  onDismiss: () => void;
}

type PlaybackMode = 'video' | 'iframe' | 'none';

interface IPlayback {
  mode: PlaybackMode;
  src: string;
}

/**
 * SharePoint Stream's stream.aspx player page blocks iframe embedding via
 * X-Frame-Options. Detect those URLs and play the underlying file directly
 * with HTML5 <video>, using the user's authenticated SharePoint session.
 * Falls back to iframe for non-Stream URLs (e.g. YouTube embeds).
 */
function resolvePlayback(rawUrl: string): IPlayback {
  if (!rawUrl) return { mode: 'none', src: '' };
  try {
    const u = new URL(rawUrl);
    const isStreamPlayer = u.pathname.toLowerCase().indexOf('/stream.aspx') !== -1;
    if (isStreamPlayer) {
      const id = u.searchParams.get('id');
      if (id) {
        return { mode: 'video', src: `${u.origin}${id}` };
      }
    }
    return { mode: 'iframe', src: rawUrl };
  } catch {
    return { mode: 'iframe', src: rawUrl };
  }
}

export const VideoModal: React.FC<IVideoModalProps> = ({
  videoLabel,
  videoUrl,
  isOpen,
  onDismiss,
}) => {
  const playback = React.useMemo(() => resolvePlayback(videoUrl), [videoUrl]);

  const handleOpenExternal = React.useCallback((): void => {
    if (!videoUrl) return;
    window.open(videoUrl, '_blank', 'noopener,noreferrer');
  }, [videoUrl]);

  return (
    <Dialog
      hidden={!isOpen}
      onDismiss={onDismiss}
      dialogContentProps={{
        type: DialogType.normal,
        title: videoLabel || 'Video',
        showCloseButton: true,
      }}
      modalProps={{
        isBlocking: false,
        styles: {
          main: {
            maxWidth: '1040px !important',
            width: '92vw',
          },
        },
      }}
    >
      <div className={styles.videoFrameWrap}>
        {playback.mode === 'video' && (
          <video
            key={playback.src}
            src={playback.src}
            controls
            controlsList="nodownload"
            preload="metadata"
            className={styles.videoFrame}
          >
            Your browser does not support embedded video playback.
          </video>
        )}
        {playback.mode === 'iframe' && (
          <iframe
            title={videoLabel}
            src={playback.src}
            className={styles.videoFrame}
            allow="autoplay; fullscreen; clipboard-write"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        )}
        {playback.mode === 'none' && (
          <div className={styles.videoFallback}>
            <Icon iconName="VideoOff" aria-hidden="true" />
            <span>Video URL not available.</span>
          </div>
        )}
      </div>
      <p className={styles.videoHint}>
        Trouble loading the video? Use “Open in new tab” to watch it in SharePoint Stream.
      </p>
      <DialogFooter>
        <DefaultButton
          text="Open in new tab"
          iconProps={{ iconName: 'OpenInNewTab' }}
          onClick={handleOpenExternal}
          disabled={!videoUrl}
        />
        <PrimaryButton text="Close" onClick={onDismiss} />
      </DialogFooter>
    </Dialog>
  );
};
