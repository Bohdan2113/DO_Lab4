// Main solver class that orchestrates the algorithms

import { Cell } from "../models/cell.js";
import { MinElementMethod } from "../algorithms/minElementMethod.js";
import { PotentialMethod } from "../algorithms/potentialMethod.js";
import { EPSILON, MAX_ITERATIONS } from "../constants.js";

export class TransportationProblemSolver {
  constructor(costs, supplies, demands, logger) {
    this.costs = costs.map((row) => [...row]);
    this.originalSupplies = [...supplies];
    this.originalDemands = [...demands];
    this.m = supplies.length;
    this.n = demands.length;
    this.logger = logger;
    this.plan = Array.from({ length: this.m }, () => Array(this.n).fill(null));
    this.isBalanced = true;
    this.isSupplyDummy = false;
    this.isDemandDummy = false;
    this.supplies = [];
    this.demands = [];
    this.checkAndBalance();
  }

  checkAndBalance() {
    const totalSupply = this.originalSupplies.reduce((a, b) => a + b, 0);
    const totalDemand = this.originalDemands.reduce((a, b) => a + b, 0);

    if (Math.abs(totalSupply - totalDemand) < EPSILON) {
      this.supplies = [...this.originalSupplies];
      this.demands = [...this.originalDemands];
      this.isBalanced = true;
      this.logger.logHeader(
        "Balance Check",
        `Problem is <span class="text-green-600 font-bold">closed (balanced)</span>. Sum of supplies (${totalSupply}) equals sum of demands (${totalDemand}).`
      );
      return;
    }

    this.isBalanced = false;
    const diff = Math.abs(totalSupply - totalDemand);

    if (totalSupply < totalDemand) {
      // Open problem: Demand > Supply. Add dummy supplier.
      this.logger.logHeader(
        "Balance Check",
        `Problem is <span class="text-yellow-800 font-bold">open (unbalanced)</span>. Supply (${totalSupply}) < Demand (${totalDemand}).`
      );
      this.logger.logStep(
        "Balancing",
        `Add dummy supplier (Supplier ${this.m + 1}) with supply ${diff}.`
      );
      this.supplies = [...this.originalSupplies, diff];
      this.demands = [...this.originalDemands];
      this.costs.push(Array(this.n).fill(0)); // Dummy costs are zero
      this.m++;
      this.isSupplyDummy = true;
    } else {
      // Open problem: Supply > Demand. Add dummy consumer.
      this.logger.logHeader(
        "Balance Check",
        `Problem is <span class="text-yellow-800 font-bold">open (unbalanced)</span>. Supply (${totalSupply}) > Demand (${totalDemand}).`
      );
      this.logger.logStep(
        "Balancing",
        `Add dummy consumer (Consumer ${this.n + 1}) with demand ${diff}.`
      );
      this.demands = [...this.originalDemands, diff];
      this.supplies = [...this.originalSupplies];
      this.costs.forEach((row) => row.push(0)); // Dummy costs are zero
      this.n++;
      this.isDemandDummy = true;
    }
    this.plan = Array.from({ length: this.m }, () => Array(this.n).fill(null));
  }

  solve() {
    this.findInitialPlanMinElement();
    this.checkDegeneracy();
    this.optimizePlanPotentials();
  }

  findInitialPlanMinElement() {
    this.logger.logHeader(
      "--- STAGE 1: Finding Initial Basic Feasible Solution using Minimum Cost Method ---"
    );

    const minElement = new MinElementMethod(
      this.costs,
      this.supplies,
      this.demands
    );

    this.plan = minElement.findInitialPlan(() => {}); // No step-by-step logging like C#

    this.logger.logFinalPlan(
      "Initial Basic Feasible Solution (Minimum Cost Method):",
      this.plan,
      this.costs,
      this.supplies,
      this.demands,
      this.calculateTotalCost(this.plan, this.costs)
    );
  }

  calculateTotalCost(plan, costs) {
    let totalCost = 0;
    for (let i = 0; i < this.m; i++) {
      for (let j = 0; j < this.n; j++) {
        if (plan[i][j] !== null) {
          totalCost += plan[i][j] * costs[i][j];
        }
      }
    }
    return totalCost;
  }

  optimizePlanPotentials() {
    this.logger.logHeader(
      "--- STAGE 2: Finding Optimal Solution using Potential Method (MODI) ---"
    );

    const potentialMethod = new PotentialMethod(this.costs, this.plan);
    let iteration = 1;

    while (iteration <= MAX_ITERATIONS) {
      this.logger.logHeader(`--- Iteration ${iteration} ---`);
      potentialMethod.plan = this.plan;

      const { u, v } = potentialMethod.calculatePotentials();

      // Log base row message (C# approach)
      if (potentialMethod.baseRowMessage) {
        this.logger.logStep(
          "Potential Calculation",
          potentialMethod.baseRowMessage
        );
      }

      this.logger.logPotentials(
        this.plan,
        this.costs,
        this.supplies,
        this.demands,
        u,
        v
      );

      const deltas = potentialMethod.calculateDeltas(u, v);
      const { maxDelta, enteringCell } = potentialMethod.findMaxDelta(deltas);

      this.logger.logDeltas(
        this.plan,
        this.costs,
        this.supplies,
        this.demands,
        deltas
      );

      if (maxDelta <= EPSILON || enteringCell === null) {
        this.logger.logStep(
          "Optimality",
          "\nAll Δ values are <= 0. The current plan is OPTIMAL."
        );
        this.logger.logFinalPlan(
          "FINAL OPTIMAL PLAN",
          this.plan,
          this.costs,
          this.supplies,
          this.demands,
          this.calculateTotalCost(this.plan, this.costs),
          this.isSupplyDummy,
          this.isDemandDummy
        );
        this.printFinalSummary(u, v);
        return;
      }

      this.logger.logStep(
        "Non-optimality",
        `\nThe plan is not optimal. Maximum positive Δ = ${maxDelta.toFixed(
          2
        )} is in cell (Supplier ${enteringCell.row + 1}, Consumer ${
          enteringCell.col + 1
        }).`
      );

      const cycle = potentialMethod.findCycle(enteringCell);

      if (!cycle) {
        this.logger.logError(
          "Error",
          "Could not find a reallocation cycle. Further optimization is not possible."
        );
        break;
      }

      this.logger.logCycle(
        cycle,
        this.plan,
        this.costs,
        this.supplies,
        this.demands
      );

      potentialMethod.reallocatePlan(cycle, this.plan, this.logger);
      this.logger.logFinalPlan(
        `New basic feasible solution after reallocation:`,
        this.plan,
        this.costs,
        this.supplies,
        this.demands,
        this.calculateTotalCost(this.plan, this.costs)
      );

      iteration++;
    }

    if (iteration > MAX_ITERATIONS) {
      this.logger.logStep(
        "Warning",
        "\nWarning: Maximum number of iterations reached. The solution may not be optimal."
      );
    }
  }

  checkDegeneracy() {
    let filledCells = 0;
    for (let i = 0; i < this.m; i++) {
      for (let j = 0; j < this.n; j++) {
        if (this.plan[i][j] !== null) filledCells++;
      }
    }
    const requiredCells = this.m + this.n - 1;

    if (filledCells < requiredCells) {
      this.handleDegeneracy(filledCells);
    } else {
      this.logger.logStep(
        "Degeneracy Check",
        `\nThe plan is non-degenerate. Filled cells: ${filledCells} (m+n-1 = ${requiredCells}).`
      );
    }
  }

  handleDegeneracy(filledCells) {
    const requiredCells = this.m + this.n - 1;
    const missingCells = requiredCells - filledCells;

    if (missingCells > 0) {
      this.logger.logStep(
        "Degeneracy Check",
        `\nPlan is degenerate. Adding ${missingCells} fictitious allocation(s) with zero shipment.`
      );

      const potentialMethod = new PotentialMethod(this.costs, this.plan);

      for (let k = 0; k < missingCells; k++) {
        let minCost = Infinity;
        let bestCell = null;

        for (let i = 0; i < this.m; i++) {
          for (let j = 0; j < this.n; j++) {
            if (this.plan[i][j] === null && this.costs[i][j] < minCost) {
              // Temporarily add a zero allocation
              const tempPlan = this.plan.map((row) => row.map((cell) => cell));
              tempPlan[i][j] = 0;

              if (potentialMethod.isAcyclic(tempPlan)) {
                minCost = this.costs[i][j];
                bestCell = new Cell(i, j);
              }
            }
          }
        }

        if (bestCell !== null) {
          this.plan[bestCell.row][bestCell.col] = 0;
          this.logger.logStep(
            "Degeneracy Resolution",
            `Added fictitious zero allocation to cell (Supplier ${
              bestCell.row + 1
            }, Consumer ${bestCell.col + 1}).`
          );
        } else {
          this.logger.logStep(
            "Warning",
            "Warning: Could not add a fictitious allocation without creating a cycle."
          );
          break;
        }
      }

      this.logger.logFinalPlan(
        "Plan after handling degeneracy:",
        this.plan,
        this.costs,
        this.supplies,
        this.demands,
        this.calculateTotalCost(this.plan, this.costs)
      );
    }
  }

  printFinalSummary(u, v) {
    this.logger.logHeader("          FINAL OPTIMAL SOLUTION SUMMARY", "");

    this.logger.logFinalPlan(
      "Final Transportation Plan:",
      this.plan,
      this.costs,
      this.supplies,
      this.demands,
      this.calculateTotalCost(this.plan, this.costs),
      this.isSupplyDummy,
      this.isDemandDummy
    );

    // Log optimal shipment details
    let detailsHtml =
      "<div class='mt-4'><h5 class='font-bold mb-2'>Optimal Shipment Details:</h5><ul>";
    for (let i = 0; i < this.m; i++) {
      for (let j = 0; j < this.n; j++) {
        if (this.plan[i][j] !== null && this.plan[i][j] > EPSILON) {
          detailsHtml += `<li>Ship ${this.plan[i][j].toFixed(
            1
          )} units from Supplier ${i + 1} to Consumer ${j + 1}</li>`;
        }
      }
    }
    detailsHtml += "</ul></div>";

    // Log final potentials
    detailsHtml +=
      "<div class='mt-4'><h5 class='font-bold mb-2'>Final Potentials for Optimality Check:</h5><p>";
    const uStr = u.map((val, i) => `u${i + 1}=${val.toFixed(1)}`).join("  ");
    const vStr = v.map((val, j) => `v${j + 1}=${val.toFixed(1)}`).join("  ");
    detailsHtml += `${uStr}<br>${vStr}`;
    detailsHtml += "</p></div>";

    this.logger.addSection("Final Summary Details", detailsHtml);
  }
}
