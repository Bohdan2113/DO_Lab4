// Module for handling UI input and matrix generation

import { EPSILON, DOM_IDS } from "../constants.js";

export class InputHandler {
  constructor() {
    const container = document.getElementById(DOM_IDS.MATRIX_CONTAINER);
    if (!container) {
      throw new Error(
        `Element with id '${DOM_IDS.MATRIX_CONTAINER}' not found`
      );
    }
    this.matrixContainer = container;
    this.numSuppliers = 4;
    this.numConsumers = 4;
  }

  /**
   * Generates the matrix UI with input fields
   */
  generateMatrixUI(costs, supplies, demands) {
    this.numSuppliers = costs.length;
    this.numConsumers = costs[0].length;

    let html = `
      <table class="input-table w-full text-sm">
        <thead>
          <tr class="bg-gray-100">
            <th class="w-20"></th>
            ${Array.from(
              { length: this.numConsumers },
              (_, j) => `<th class="w-20">Consumer ${j + 1}</th>`
            ).join("")}
            <th class="w-24 bg-red-100 text-red-700">Supply (aᵢ)</th>
          </tr>
        </thead>
        <tbody>
    `;

    for (let i = 0; i < this.numSuppliers; i++) {
      html += `<tr class="cost-row">
        <th class="bg-blue-50 text-blue-700">Supplier ${i + 1}</th>
        ${Array.from(
          { length: this.numConsumers },
          (_, j) => `
          <td><input type="number" step="0.1" value="${costs[i][j]}" class="input-cell cost-cell w-full"></td>
        `
        ).join("")}
        <td class="bg-red-50">
          <input type="number" step="1" value="${
            supplies[i]
          }" class="input-cell supply-cell w-full">
        </td>
      </tr>`;
    }

    // Demand Row
    html += `<tr class="demand-row bg-green-50">
      <th class="text-green-700">Demand (bⱼ)</th>
      ${Array.from(
        { length: this.numConsumers },
        (_, j) => `
        <td><input type="number" step="1" value="${demands[j]}" class="input-cell demand-cell w-full"></td>
      `
      ).join("")}
      <td class="bg-gray-200 font-bold text-gray-700" id="${
        DOM_IDS.TOTAL_BALANCE
      }">
        ${supplies.reduce((a, b) => a + b, 0).toFixed(0)} / ${demands
      .reduce((a, b) => a + b, 0)
      .toFixed(0)}
      </td>
    </tr>
        </tbody>
      </table>
    `;
    this.matrixContainer.innerHTML = html;

    // Add listeners for balance update
    document.querySelectorAll(".input-cell").forEach((input) => {
      input.addEventListener("input", () => this.updateBalanceDisplay());
    });
  }

  /**
   * Updates the balance display
   */
  updateBalanceDisplay() {
    const currentSupplies = [];
    document.querySelectorAll(".supply-cell").forEach((input) => {
      const val = parseFloat(input.value);
      if (!isNaN(val) && val >= 0) currentSupplies.push(val);
    });

    const currentDemands = [];
    document.querySelectorAll(".demand-cell").forEach((input) => {
      const val = parseFloat(input.value);
      if (!isNaN(val) && val >= 0) currentDemands.push(val);
    });

    const totalSupply = currentSupplies.reduce((a, b) => a + b, 0);
    const totalDemand = currentDemands.reduce((a, b) => a + b, 0);
    const balanceElement = document.getElementById(DOM_IDS.TOTAL_BALANCE);

    if (!balanceElement) return;

    balanceElement.textContent = `${totalSupply.toFixed(
      0
    )} / ${totalDemand.toFixed(0)}`;
    if (Math.abs(totalSupply - totalDemand) > EPSILON) {
      balanceElement.classList.remove("bg-green-200", "text-green-800");
      balanceElement.classList.add("bg-yellow-200", "text-yellow-800");
      balanceElement.title = `Imbalance: ${Math.abs(
        totalSupply - totalDemand
      ).toFixed(2)}`;
    } else {
      balanceElement.classList.remove("bg-yellow-200", "text-yellow-800");
      balanceElement.classList.add("bg-green-200", "text-green-800");
      balanceElement.title = "Problem is balanced";
    }
  }

  /**
   * Parses input from the matrix UI
   */
  parseInputMatrix() {
    const rows = this.matrixContainer.querySelectorAll(".cost-row");
    const costs = [];
    const supplies = [];
    const demands = [];

    try {
      rows.forEach((row) => {
        const cells = row.querySelectorAll(".cost-cell");
        const costRow = [];
        cells.forEach((cell) => {
          const value = parseFloat(cell.value);
          if (isNaN(value) || value < 0) {
            throw new Error("Cost must be a non-negative number.");
          }
          costRow.push(value);
        });
        costs.push(costRow);

        const supplyCell = row.querySelector(".supply-cell");
        const supplyValue = parseFloat(supplyCell.value);
        if (isNaN(supplyValue) || supplyValue < 0) {
          throw new Error("Supply must be a non-negative number.");
        }
        supplies.push(supplyValue);
      });

      const demandRow = this.matrixContainer.querySelector(".demand-row");
      if (!demandRow) throw new Error("Demand row not found");

      const demandCells = demandRow.querySelectorAll(".demand-cell");
      demandCells.forEach((cell) => {
        const value = parseFloat(cell.value);
        if (isNaN(value) || value < 0) {
          throw new Error("Demand must be a non-negative number.");
        }
        demands.push(value);
      });

      return { costs, supplies, demands };
    } catch (e) {
      const error = e;
      this.showMessage("Invalid Input Data", error.message);
      return null;
    }
  }

  /**
   * Shows a message to the user
   */
  showMessage(title, body, isError = true) {
    const box = document.getElementById(DOM_IDS.MESSAGE_BOX);
    const titleEl = document.getElementById(DOM_IDS.MESSAGE_TITLE);
    const bodyEl = document.getElementById(DOM_IDS.MESSAGE_BODY);

    if (!box || !titleEl || !bodyEl) return;

    titleEl.textContent = title;
    bodyEl.textContent = body;
    titleEl.classList.toggle("text-red-600", isError);
    titleEl.classList.toggle("text-green-600", !isError);
    box.classList.remove("hidden");
    box.classList.add("flex");
  }

  /**
   * Adds a supplier row
   */
  addSupplier(defaultCosts, defaultSupplies, defaultDemands) {
    this.numSuppliers++;
    const newCosts = defaultCosts.map((row) => [...row]);
    newCosts.push(Array(this.numConsumers).fill(1));
    const newSupplies = [...defaultSupplies, 10];
    this.generateMatrixUI(newCosts, newSupplies, defaultDemands);
    this.updateBalanceDisplay();
  }

  /**
   * Adds a consumer column
   */
  addConsumer(defaultCosts, defaultSupplies, defaultDemands) {
    this.numConsumers++;
    const newCosts = defaultCosts.map((row) => [...row, 1]);
    const newDemands = [...defaultDemands, 10];
    this.generateMatrixUI(newCosts, defaultSupplies, newDemands);
    this.updateBalanceDisplay();
  }
}
