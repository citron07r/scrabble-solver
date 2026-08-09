import classNames from 'classnames';
import { type FunctionComponent } from 'react';
import { useDebounce } from 'use-debounce';

import { LOCALE_FEATURES } from '@/i18n';
import { GeoAlt, OneTwoThree } from '@/icons';
import {
  selectAreResultsOutdated,
  selectConfig,
  selectDrawCandidates,
  selectDrawRows,
  selectDrawsBaseline,
  selectLocale,
  selectSolveError,
  selectSolveIsLoading,
  useTranslate,
  useTypedSelector,
} from '@/state';

import { EmptyState } from '../EmptyState';
import { Loading } from '../Loading';
import { type ResultCallbacks, SolveButton } from '../Results';

import styles from './DrawResults.module.scss';
import { DrawRow } from './DrawRow';

interface Props {
  callbacks: ResultCallbacks;
  className?: string;
}

const IS_LOADING_DEBOUNCE = 100;

export const DrawResults: FunctionComponent<Props> = ({ callbacks, className }) => {
  const translate = useTranslate();
  const locale = useTypedSelector(selectLocale);
  const { direction } = LOCALE_FEATURES[locale];
  const config = useTypedSelector(selectConfig);
  const rows = useTypedSelector(selectDrawRows);
  const baseline = useTypedSelector(selectDrawsBaseline);
  const candidates = useTypedSelector(selectDrawCandidates);
  const isLoading = useTypedSelector(selectSolveIsLoading);
  const [isLoadingDebounced] = useDebounce(isLoading, IS_LOADING_DEBOUNCE);
  const isOutdated = useTypedSelector(selectAreResultsOutdated);
  const error = useTypedSelector(selectSolveError);
  const hasRows = typeof error === 'undefined' && typeof rows !== 'undefined';

  return (
    <div
      aria-busy={isLoadingDebounced}
      aria-label={translate('duplicatCompletiv')}
      className={classNames(styles.drawResults, className)}
      data-outdated={isOutdated}
      data-testid="draw-results"
      role="region"
    >
      <div className={styles.header} dir={direction}>
        <span className={classNames(styles.cell, styles.draw)}>{translate('duplicatCompletiv.column.draw')}</span>
        <span className={classNames(styles.cell, styles.word)}>{translate('common.word')}</span>
        <span
          aria-label={translate('settings.showCoordinates')}
          className={classNames(styles.cell, styles.coordinates)}
        >
          <GeoAlt className={styles.coordinatesIcon} />
        </span>
        <span aria-label={translate('common.points')} className={classNames(styles.cell, styles.points)}>
          <OneTwoThree className={styles.pointsIcon} />
          <span className={styles.pointsLabel}>{translate('common.points')}</span>
        </span>
        <span className={classNames(styles.cell, styles.left)}>{translate('duplicatCompletiv.column.left')}</span>
      </div>

      <div aria-live="polite" className={styles.content}>
        {typeof error !== 'undefined' && (
          <EmptyState className={styles.emptyState} variant="error">
            {error.message}
          </EmptyState>
        )}

        {typeof error === 'undefined' && !config.supportsRemainingTiles && (
          <EmptyState className={styles.emptyState} variant="warning">
            {translate('duplicatCompletiv.empty-state.unsupported')}
          </EmptyState>
        )}

        {typeof error === 'undefined' && config.supportsRemainingTiles && typeof rows === 'undefined' && (
          <EmptyState className={styles.emptyState} variant="info">
            {translate('duplicatCompletiv.empty-state.uninitialized')}

            <SolveButton className={styles.solveButton} />
          </EmptyState>
        )}

        {hasRows && config.supportsRemainingTiles && (
          <>
            {isOutdated && (
              <EmptyState className={styles.emptyState} variant="info">
                {translate('results.empty-state.outdated')}

                <SolveButton className={styles.solveButton} />
              </EmptyState>
            )}

            {!isOutdated && candidates.length === 0 && (
              <EmptyState className={styles.emptyState} variant="warning">
                {translate('duplicatCompletiv.empty-state.no-candidates')}
              </EmptyState>
            )}

            {!isOutdated && candidates.length > 0 && (
              <div className={styles.listContainer} onMouseLeave={callbacks.onMouseLeave}>
                <p className={styles.baseline} dir={direction}>
                  {translate('duplicatCompletiv.baseline', {
                    move: baseline
                      ? `${baseline.word.toLocaleUpperCase(locale)} (${baseline.points.toLocaleString(locale)})`
                      : translate('duplicatCompletiv.no-move'),
                  })}
                </p>

                <ul className={styles.list} dir={direction}>
                  {rows.map((row, index) => (
                    <DrawRow callbacks={callbacks} key={`${row.character}-${row.isBlank}-${index}`} row={row} />
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>

      {isLoadingDebounced && <Loading />}
    </div>
  );
};
