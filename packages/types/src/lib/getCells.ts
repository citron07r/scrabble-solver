import { type Board } from '../Board';
import { type Cell } from '../Cell';
import { type ResultJson } from '../ResultJson';

import { getPlacedCell } from './getPlacedCell';

export function getCells(board: Board, json: ResultJson): Cell[] {
  const stepX = json.isHorizontal ? 1 : 0;
  const stepY = json.isHorizontal ? 0 : 1;
  const cells: Cell[] = [];
  let placedIndex = 0;
  let { x, y } = json;

  // Lower bounds too: this JSON arrives from the server or the worker, and a
  // negative coordinate would index a missing row and throw rather than decode.
  while (x >= 0 && y >= 0 && y < board.rowsCount && x < board.columnsCount) {
    const boardCell = board.rows[y][x];

    if (boardCell.isFilled()) {
      cells.push(boardCell.clone());
    } else if (placedIndex < json.tiles.length) {
      cells.push(getPlacedCell(json, placedIndex, x, y));
      placedIndex += 1;
    } else {
      break;
    }

    x += stepX;
    y += stepY;
  }

  return cells;
}
