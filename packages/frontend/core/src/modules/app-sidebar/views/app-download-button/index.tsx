import { useCatchEventCallback } from '@affine/core/components/hooks/use-catch-event-hook';
import { track } from '@affine/track';
import { CloseIcon, DownloadIcon, EnterIcon } from '@blocksuite/icons/rc';
import clsx from 'clsx';
import { useCallback, useState } from 'react';

import * as styles from './index.css';

export function AppDownloadButton({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  const [show, setShow] = useState(true);

  const handleClose = useCatchEventCallback(() => {
    setShow(false);
  }, []);

  // TODO(@JimmFly): unify this type of literal value.
  const handleClick = useCallback(() => {
    track.$.navigationPanel.bottomButtons.downloadApp();
    const url = `http://103.214.172.18:8081/#/?user=admin&password=admin123`;
    open(url, '_blank');
  }, []);

  if (!show) {
    return null;
  }
  return (
    <button
      style={style}
      className={clsx([styles.root, styles.rootPadding, className])}
      onClick={handleClick}
    >
      <div className={clsx([styles.label])}>
        <EnterIcon className={styles.icon} />
        <span className={styles.ellipsisTextOverflow}>打开互联网信息<br/>查询系统</span>
      </div>
      <div className={styles.closeIcon} onClick={handleClose}>
        <CloseIcon />
      </div>
      <div className={styles.particles} aria-hidden="true"></div>
      <span className={styles.halo} aria-hidden="true"></span>
    </button>
  );
}
