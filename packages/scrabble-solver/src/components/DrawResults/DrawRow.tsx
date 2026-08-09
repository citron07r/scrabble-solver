import classNames from 'classnames';
import { type FocusEventHandler, type FunctionComponent, type MouseEventHandler } from 'react';

import { noop } from '@/lib';
import { selectLocale, useTranslate, useTypedSelector } from '@/state';
import { type DrawRow as DrawRowModel } from '@/types';

import { type ResultCallbacks } from '../Results';

import styles from './DrawResults.module.scss';

interface Props {
  callbacks: ResultCallbacks;
  row: DrawRowModel;
}

export const DrawRow: FunctionComponent<Props> = ({ callbacks, row }) => {
  const translate = useTranslate();
  const locale = useTypedSelector(selectLocale);
  const { character, coordinates, isBlank, remainingCount, result } = row;
  const { onBlur = noop, onClick = noop, onFocus = noop, onMouseEnter = noop } = callbacks;
  const draw = character.toLocaleUpperCase(locale);
  const label = isBlank ? translate('duplicatCompletiv.blank', { character: draw }) : draw;

  const handleBlur: FocusEventHandler = (event) => result && onBlur(result, event);
  const handleClick: MouseEventHandler = (event) => result && onClick(result, event);
  const handleFocus: FocusEventHandler = (event) => result && onFocus(result, event);
  const handleMouseEnter: MouseEventHandler = (event) => result && onMouseEnter(result, event);

  return (
    <li>
      <button
        aria-label={result ? `${label}: ${result.word}` : `${label}: ${translate('duplicatCompletiv.no-move')}`}
        className={classNames(styles.row, { [styles.empty]: !result })}
        data-testid="draw-row"
        disabled={!result}
        type="button"
        onBlur={handleBlur}
        onClick={handleClick}
        onFocus={handleFocus}
        onMouseEnter={handleMouseEnter}
      >
        <span className={classNames(styles.cell, styles.draw)} title={label}>
          <span className={classNames(styles.drawTile, { [styles.blankTile]: isBlank })}>{draw}</span>
        </span>

        <span className={classNames(styles.cell, styles.word)}>
          {result ? result.word.toLocaleUpperCase(locale) : translate('duplicatCompletiv.no-move')}
        </span>

        <span className={classNames(styles.cell, styles.coordinates)}>{coordinates}</span>

        <span className={classNames(styles.cell, styles.points)}>
          {result ? result.points.toLocaleString(locale) : ''}
        </span>

        <span className={classNames(styles.cell, styles.left)}>{remainingCount.toLocaleString(locale)}</span>
      </button>
    </li>
  );
};
