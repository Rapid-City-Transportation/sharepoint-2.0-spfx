import * as React from 'react';
import { Icon } from '@fluentui/react/lib/Icon';
import styles from './QuizzesPanel.module.scss';
import { TRAINING_STAGES, ITrainingItem, ITrainingStage } from './trainingStages';
import { useTrainingProgress } from './useTrainingProgress';
import { VideoModal } from './VideoModal';

interface IActiveVideo {
  label: string;
  url: string;
}

type ItemKind = 'video' | 'quiz';

export const QuizzesPanel: React.FC = () => {
  const { isComplete, toggle, count } = useTrainingProgress();
  const [expanded, setExpanded] = React.useState<Record<number, boolean>>({ 1: true });
  const [activeVideo, setActiveVideo] = React.useState<IActiveVideo | null>(null);

  const handleToggleStage = React.useCallback((n: number): void => {
    setExpanded(prev => ({ ...prev, [n]: !prev[n] }));
  }, []);

  const handleOpenVideo = React.useCallback((item: ITrainingItem): void => {
    if (!item.url) return;
    setActiveVideo({ label: item.label, url: item.url });
  }, []);

  const handleOpenQuiz = React.useCallback((item: ITrainingItem): void => {
    if (!item.url) return;
    window.open(
      item.url,
      '_blank',
      'popup,width=1000,height=900,scrollbars=yes,resizable=yes'
    );
  }, []);

  const handleDismissVideo = React.useCallback((): void => {
    setActiveVideo(null);
  }, []);

  return (
    <div className={styles.panel}>
      <header className={styles.panelHeader}>
        <div className={styles.panelHeaderText}>
          <p className={styles.panelSubtitle}>
            Work through each stage’s videos and quizzes. Progress saves locally on this browser.
          </p>
        </div>
        <span className={styles.panelHeaderBadge} aria-hidden="true">
          <Icon iconName="Education" />
        </span>
      </header>

      <ul className={styles.stageList} role="list">
        {TRAINING_STAGES.map(stage => (
          <StageCard
            key={stage.number}
            stage={stage}
            isOpen={!!expanded[stage.number]}
            completed={count([
              ...stage.videos.map(v => v.key),
              ...stage.quizzes.map(q => q.key),
            ])}
            onToggleStage={() => handleToggleStage(stage.number)}
            isComplete={isComplete}
            onItemToggle={toggle}
            onOpenVideo={handleOpenVideo}
            onOpenQuiz={handleOpenQuiz}
          />
        ))}
      </ul>

      <VideoModal
        videoLabel={activeVideo?.label || ''}
        videoUrl={activeVideo?.url || ''}
        isOpen={!!activeVideo}
        onDismiss={handleDismissVideo}
      />
    </div>
  );
};

interface IStageCardProps {
  stage: ITrainingStage;
  isOpen: boolean;
  completed: number;
  onToggleStage: () => void;
  isComplete: (key: string) => boolean;
  onItemToggle: (key: string) => void;
  onOpenVideo: (item: ITrainingItem) => void;
  onOpenQuiz: (item: ITrainingItem) => void;
}

const StageCard: React.FC<IStageCardProps> = ({
  stage,
  isOpen,
  completed,
  onToggleStage,
  isComplete,
  onItemToggle,
  onOpenVideo,
  onOpenQuiz,
}) => {
  const total = stage.videos.length + stage.quizzes.length;
  const isFullyComplete = total > 0 && completed === total;
  const bodyId = `training-stage-body-${stage.number}`;

  const metaParts: string[] = [];
  if (stage.videos.length > 0) {
    metaParts.push(`${stage.videos.length} video${stage.videos.length === 1 ? '' : 's'}`);
  }
  if (stage.quizzes.length > 0) {
    metaParts.push(`${stage.quizzes.length} quiz${stage.quizzes.length === 1 ? '' : 'zes'}`);
  }

  return (
    <li className={`${styles.stage} ${isFullyComplete ? styles.stageDone : ''}`}>
      <button
        type="button"
        className={styles.stageHeader}
        onClick={onToggleStage}
        aria-expanded={isOpen}
        aria-controls={bodyId}
      >
        <span className={styles.stageNumberPill} aria-hidden="true">
          {isFullyComplete ? <Icon iconName="CheckMark" /> : stage.number}
        </span>
        <span className={styles.stageHeaderText}>
          <span className={styles.stageEyebrow}>Stage {stage.number}</span>
          <span className={styles.stageTitle}>{stage.title}</span>
          <span className={styles.stageMeta}>{metaParts.join(' · ')}</span>
        </span>
        <span
          className={`${styles.stageProgress} ${isFullyComplete ? styles.stageProgressDone : ''}`}
          aria-label={`${completed} of ${total} complete`}
        >
          {completed}/{total}
        </span>
        <Icon
          iconName={isOpen ? 'ChevronUp' : 'ChevronDown'}
          className={styles.stageChevron}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div id={bodyId} className={styles.stageBody}>
          {stage.videos.length > 0 && (
            <ItemSection
              title="Videos"
              icon="MSNVideos"
              kind="video"
              items={stage.videos}
              isComplete={isComplete}
              onToggle={onItemToggle}
              onOpen={onOpenVideo}
            />
          )}
          {stage.quizzes.length > 0 && (
            <ItemSection
              title="Quizzes"
              icon="TextDocument"
              kind="quiz"
              items={stage.quizzes}
              isComplete={isComplete}
              onToggle={onItemToggle}
              onOpen={onOpenQuiz}
            />
          )}
        </div>
      )}
    </li>
  );
};

interface IItemSectionProps {
  title: string;
  icon: string;
  kind: ItemKind;
  items: ITrainingItem[];
  isComplete: (key: string) => boolean;
  onToggle: (key: string) => void;
  onOpen: (item: ITrainingItem) => void;
}

const ItemSection: React.FC<IItemSectionProps> = ({
  title,
  icon,
  kind,
  items,
  isComplete,
  onToggle,
  onOpen,
}) => {
  return (
    <section
      className={`${styles.itemSection} ${kind === 'video' ? styles.itemSectionVideo : styles.itemSectionQuiz}`}
      aria-label={title}
    >
      <h5 className={styles.itemSectionTitle}>
        <Icon iconName={icon} aria-hidden="true" />
        <span>{title}</span>
        <span className={styles.itemSectionCount}>{items.length}</span>
      </h5>
      <ul className={styles.itemList} role="list">
        {items.map(item => (
          <ItemRow
            key={item.key}
            item={item}
            kind={kind}
            done={isComplete(item.key)}
            onToggle={() => onToggle(item.key)}
            onOpen={() => onOpen(item)}
          />
        ))}
      </ul>
    </section>
  );
};

interface IItemRowProps {
  item: ITrainingItem;
  kind: ItemKind;
  done: boolean;
  onToggle: () => void;
  onOpen: () => void;
}

const ItemRow: React.FC<IItemRowProps> = ({ item, kind, done, onToggle, onOpen }) => {
  const hasUrl = !!item.url;
  const actionLabel = kind === 'video' ? 'Watch' : 'Open form';
  const actionIcon = kind === 'video' ? 'Play' : 'OpenInNewTab';

  return (
    <li
      className={`${styles.itemRow} ${done ? styles.itemRowDone : ''}`}
    >
      <label className={styles.itemCheck}>
        <input
          type="checkbox"
          checked={done}
          onChange={onToggle}
          aria-label={`Mark "${item.label}" complete`}
        />
        <span aria-hidden="true" className={styles.itemCheckBox}>
          {done && <Icon iconName="CheckMark" />}
        </span>
      </label>

      <span className={styles.itemLabel}>{item.label}</span>

      <button
        type="button"
        className={styles.itemAction}
        onClick={onOpen}
        disabled={!hasUrl}
        title={hasUrl ? actionLabel : 'Coming soon'}
        aria-label={hasUrl ? `${actionLabel}: ${item.label}` : `${item.label} — coming soon`}
      >
        <Icon iconName={hasUrl ? actionIcon : 'ConstructionCone'} aria-hidden="true" />
        <span className={styles.itemActionLabel}>
          {hasUrl ? actionLabel : 'Coming soon'}
        </span>
      </button>
    </li>
  );
};
