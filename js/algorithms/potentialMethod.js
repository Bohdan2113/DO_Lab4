// Module for Potential Method (MODI) algorithm

import { Cell } from "../models/cell.js";
import { EPSILON } from "../constants.js";

export class PotentialMethod {
  constructor(costs, plan) {
    this.costs = costs;
    this.plan = plan;
    this.m = plan.length;
    this.n = plan[0].length;
  }

  /**
   * Calculates potentials u and v for occupied cells
   * Based on C# implementation: finds row with most allocations and sets u[baseRow] = 0
   */
  calculatePotentials() {
    const u = Array(this.m).fill(null);
    const v = Array(this.n).fill(null);

    // Find row with the most filled cells (C# approach)
    let maxFilled = -1;
    let baseRow = 0;

    for (let i = 0; i < this.m; i++) {
      let currentFilled = 0;
      for (let j = 0; j < this.n; j++) {
        if (this.plan[i][j] !== null) currentFilled++;
      }
      if (currentFilled > maxFilled) {
        maxFilled = currentFilled;
        baseRow = i;
      }
    }

    u[baseRow] = 0;
    this.baseRowMessage = `Assuming u${
      baseRow + 1
    } = 0 (row with the most allocations).`;

    // Iteratively solve u_i + v_j = c_ij for occupied cells
    for (let k = 0; k < this.m + this.n; k++) {
      for (let i = 0; i < this.m; i++) {
        for (let j = 0; j < this.n; j++) {
          if (this.plan[i][j] !== null) {
            if (u[i] !== null && v[j] === null) {
              v[j] = this.costs[i][j] - u[i];
            } else if (u[i] === null && v[j] !== null) {
              u[i] = this.costs[i][j] - v[j];
            }
          }
        }
      }
    }

    // Ensure all potentials are assigned
    for (let i = 0; i < this.m; i++) {
      if (u[i] === null) u[i] = 0;
    }
    for (let j = 0; j < this.n; j++) {
      if (v[j] === null) v[j] = 0;
    }

    return { u, v };
  }
  /**
   * Calculates deltas for unoccupied cells
   */

  calculateDeltas(u, v) {
    const deltas = Array.from({ length: this.m }, () =>
      Array(this.n).fill(null)
    );
    for (let i = 0; i < this.m; i++) {
      for (let j = 0; j < this.n; j++) {
        // Only for unoccupied cells
        if (this.plan[i][j] === null) {
          deltas[i][j] = u[i] + v[j] - this.costs[i][j];
        }
      }
    }
    return deltas;
  }
  /**
   * Finds the maximum delta and entering cell
   */

  findMaxDelta(deltas) {
    let maxDelta = -Infinity;
    let enteringCell = null;

    for (let i = 0; i < this.m; i++) {
      for (let j = 0; j < this.n; j++) {
        if (
          this.plan[i][j] === null &&
          deltas[i][j] !== null &&
          deltas[i][j] > maxDelta
        ) {
          maxDelta = deltas[i][j];
          enteringCell = new Cell(i, j);
        }
      }
    }

    return { maxDelta, enteringCell };
  }

  /**
   * Finds a cycle starting from the given cell
   * Based on C# implementation: removes single cells, then builds cycle by finding next in row/col
   */
  findCycle(startCell) {
    // Clone plan and add start cell as 0 allocation
    const tempPlan = this.plan.map((row) => row.map((cell) => cell));
    tempPlan[startCell.row][startCell.col] = 0;

    // Remove cells that are the only one in their row or column (C# approach)
    while (true) {
      let removed = false;
      const rowCounts = Array(this.m).fill(0);
      const colCounts = Array(this.n).fill(0);

      // Count filled cells in each row and column
      for (let i = 0; i < this.m; i++) {
        for (let j = 0; j < this.n; j++) {
          if (tempPlan[i][j] !== null) {
            rowCounts[i]++;
            colCounts[j]++;
          }
        }
      }

      // Remove cells that are alone in their row or column
      for (let i = 0; i < this.m; i++) {
        for (let j = 0; j < this.n; j++) {
          if (
            tempPlan[i][j] !== null &&
            (rowCounts[i] === 1 || colCounts[j] === 1)
          ) {
            tempPlan[i][j] = null;
            removed = true;
          }
        }
      }

      if (!removed) break;
    }

    // Collect remaining cycle points
    const cyclePoints = [];
    for (let i = 0; i < this.m; i++) {
      for (let j = 0; j < this.n; j++) {
        if (tempPlan[i][j] !== null) {
          cyclePoints.push(new Cell(i, j));
        }
      }
    }

    if (cyclePoints.length < 4) return null;

    // Build cycle path starting from startCell (C# approach)
    const cyclePath = [startCell];
    const usedCells = new Set();
    usedCells.add(`${startCell.row},${startCell.col}`);

    // Remove startCell from cyclePoints
    const startIndex = cyclePoints.findIndex(
      (c) => c.row === startCell.row && c.col === startCell.col
    );
    if (startIndex !== -1) {
      cyclePoints.splice(startIndex, 1);
    }

    let current = startCell;

    // Build cycle by alternating row/column moves
    while (cyclePoints.length > 0) {
      // Find next cell in same row
      const nextInRow = cyclePoints.find((p) => p.row === current.row);
      if (nextInRow) {
        cyclePath.push(nextInRow);
        usedCells.add(`${nextInRow.row},${nextInRow.col}`);
        cyclePoints.splice(cyclePoints.indexOf(nextInRow), 1);
        current = nextInRow;
        continue;
      }

      // Find next cell in same column
      const nextInCol = cyclePoints.find((p) => p.col === current.col);
      if (nextInCol) {
        cyclePath.push(nextInCol);
        usedCells.add(`${nextInCol.row},${nextInCol.col}`);
        cyclePoints.splice(cyclePoints.indexOf(nextInCol), 1);
        current = nextInCol;
        continue;
      }

      // If no more moves, break
      break;
    }

    // Check if we can close the cycle
    const last = cyclePath[cyclePath.length - 1];
    const first = cyclePath[0];

    if (
      (last.row === first.row || last.col === first.col) &&
      cyclePath.length > 2
    ) {
      return cyclePath;
    }

    return null;
  }

  /**
   * Reallocates the plan based on a cycle
   * Based on C# implementation: finds minTheta, updates allocations, removes leaving cell
   */
  reallocatePlan(cycle, plan, logger) {
    // Find minimum allocation in cells with '-' sign (odd index)
    let minTheta = Infinity;
    for (let i = 1; i < cycle.length; i += 2) {
      const { row, col } = cycle[i];
      if (plan[row][col] !== null && plan[row][col] < minTheta) {
        minTheta = plan[row][col];
      }
    }

    // Log theta value (C# approach)
    if (logger) {
      logger.logStep(
        "Reallocation",
        `Reallocation amount θ = ${minTheta.toFixed(2)}`
      );
    }

    // Update allocations
    for (let i = 0; i < cycle.length; i++) {
      const { row, col } = cycle[i];
      if (i % 2 === 0) {
        // '+' sign (even index)
        if (plan[row][col] === null) plan[row][col] = 0;
        plan[row][col] += minTheta;
      } else {
        // '-' sign (odd index)
        plan[row][col] -= minTheta;
      }
    }

    // Remove the leaving cell (allocation becomes zero)
    let leavingCell = null;
    for (let i = 1; i < cycle.length; i += 2) {
      const { row, col } = cycle[i];
      if (Math.abs(plan[row][col]) < EPSILON) {
        leavingCell = cycle[i];
        break;
      }
    }

    if (leavingCell !== null) {
      plan[leavingCell.row][leavingCell.col] = null;
    }
  }

  /**
   * Checks if the plan is acyclic (for degeneracy handling)
   * Based on C# implementation
   */
  isAcyclic(plan) {
    const m = this.m;
    const n = this.n;
    let filledCount = 0;

    // Count filled cells
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < n; j++) {
        if (plan[i][j] !== null) filledCount++;
      }
    }

    // Clone plan for processing
    const tempPlan = plan.map((row) => row.map((cell) => cell));
    let removedCount = 0;

    // Remove cells that are alone in their row or column
    while (true) {
      let removedThisIteration = false;

      for (let i = 0; i < m; i++) {
        for (let j = 0; j < n; j++) {
          if (tempPlan[i][j] !== null) {
            let rowCount = 0;
            for (let c = 0; c < n; c++) {
              if (tempPlan[i][c] !== null) rowCount++;
            }

            let colCount = 0;
            for (let r = 0; r < m; r++) {
              if (tempPlan[r][j] !== null) colCount++;
            }

            if (rowCount === 1 || colCount === 1) {
              tempPlan[i][j] = null;
              removedThisIteration = true;
              removedCount++;
            }
          }
        }
      }

      if (!removedThisIteration) break;
    }

    // A non-degenerate plan will leave 0 or 1 cell remaining
    return filledCount - removedCount <= 1;
  }
  /**
   * Formats a cell value for display
   */

  getCellValue(val) {
    return val !== null ? parseFloat(val.toFixed(2)).toString() : "-";
  }
}
