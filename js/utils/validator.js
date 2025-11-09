// Module for validating input data

import { EPSILON } from '../constants.js';

export class Validator {
  /**
   * Validates transportation problem data
   */
  static validateData(data) {
    if (!data) {
      return 'No data provided';
    }

    if (!data.costs || !data.supplies || !data.demands) {
      return 'Missing required fields: costs, supplies, or demands';
    }

    const m = data.supplies.length;
    const n = data.demands.length;

    if (data.costs.length !== m) {
      return `Cost matrix has ${data.costs.length} rows, but ${m} suppliers provided`;
    }

    for (let i = 0; i < m; i++) {
      if (data.costs[i].length !== n) {
        return `Row ${i + 1} has ${data.costs[i].length} columns, but ${n} consumers provided`;
      }

      for (let j = 0; j < n; j++) {
        const cost = data.costs[i][j];
        if (isNaN(cost) || cost < 0) {
          return `Cost at row ${i + 1}, column ${j + 1} must be a non-negative number`;
        }
      }
    }

    for (let i = 0; i < m; i++) {
      const supply = data.supplies[i];
      if (isNaN(supply) || supply < 0) {
        return `Supply ${i + 1} must be a non-negative number`;
      }
    }

    for (let j = 0; j < n; j++) {
      const demand = data.demands[j];
      if (isNaN(demand) || demand < 0) {
        return `Demand ${j + 1} must be a non-negative number`;
      }
    }

    return null; // No errors
  }

  /**
   * Validates a single numeric input value
   */
  static validateNumericValue(value, fieldName) {
    const num = parseFloat(value);
    if (isNaN(num) || num < 0) {
      return null;
    }
    return num;
  }

  /**
   * Checks if the problem is balanced
   */
  static isBalanced(supplies, demands) {
    const totalSupply = supplies.reduce((a, b) => a + b, 0);
    const totalDemand = demands.reduce((a, b) => a + b, 0);
    return Math.abs(totalSupply - totalDemand) < EPSILON;
  }
}

