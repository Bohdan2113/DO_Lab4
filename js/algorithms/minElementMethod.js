// Module for Minimum Element Method algorithm

import { EPSILON } from "../constants.js";

export class MinElementMethod {
  constructor(costs, supplies, demands) {
    this.costs = costs;
    this.supplies = supplies;
    this.demands = demands;
    this.m = supplies.length;
    this.n = demands.length;
  }

  /**
   * Finds the initial plan using the minimum element method
   * Based on C# implementation: marks closed cells as -1, then cleans them
   */
  findInitialPlan(onStep) {
    const currentSupplies = [...this.supplies];
    const currentDemands = [...this.demands];
    const plan = Array.from({ length: this.m }, () => Array(this.n).fill(null));

    while (
      currentSupplies.some((s) => s > EPSILON) &&
      currentDemands.some((d) => d > EPSILON)
    ) {
      // Find minimum cost among available cells
      let minCost = Infinity;
      let minRow = -1;
      let minCol = -1;

      for (let i = 0; i < this.m; i++) {
        for (let j = 0; j < this.n; j++) {
          if (plan[i][j] === null && this.costs[i][j] < minCost) {
            minCost = this.costs[i][j];
            minRow = i;
            minCol = j;
          }
        }
      }

      if (minRow === -1) break;

      const shipment = Math.min(
        currentSupplies[minRow],
        currentDemands[minCol]
      );
      plan[minRow][minCol] = shipment;
      currentSupplies[minRow] -= shipment;
      currentDemands[minCol] -= shipment;

      // Mark closed rows/columns with -1 (C# approach)
      if (Math.abs(currentSupplies[minRow]) < EPSILON) {
        for (let j = 0; j < this.n; j++) {
          if (plan[minRow][j] === null) plan[minRow][j] = -1;
        }
      }

      if (Math.abs(currentDemands[minCol]) < EPSILON) {
        for (let i = 0; i < this.m; i++) {
          if (plan[i][minCol] === null) plan[i][minCol] = -1;
        }
      }

      onStep(
        1, // step number (not used in C# version)
        plan.map((row) => [...row]),
        [...currentSupplies],
        [...currentDemands],
        { minRow, minCol }
      );
    }

    // Clean -1 markers (convert to null)
    for (let i = 0; i < this.m; i++) {
      for (let j = 0; j < this.n; j++) {
        if (plan[i][j] === -1) plan[i][j] = null;
      }
    }

    return plan;
  }

  /**
   * Formats a cell value for display
   */
  getCellValue(val) {
    return val !== null ? parseFloat(val.toFixed(2)).toString() : "-";
  }
}
