// Module for logging solution steps

import { Cell } from "../models/cell.js";
import { EPSILON } from "../constants.js";

export class Logger {
  constructor(outputContainer) {
    this.container = outputContainer;
    this.container.innerHTML = "";
  }

  addSection(title, content) {
    const div = document.createElement("div");
    div.className = "card p-4 md:p-6 mb-8";
    div.innerHTML = `<h3 class="text-xl font-bold mb-4 text-gray-800 border-b pb-2">${title}</h3>${content}`;
    this.container.appendChild(div);

    // Re-render MathJax
    if (window.MathJax) {
      window.MathJax.typesetPromise([div]).catch((err) =>
        console.error("MathJax error:", err)
      );
    }
  }

  logHeader(title, subtitle = "") {
    this.addSection(title, `<p class="text-gray-600 mb-4">${subtitle}</p>`);
  }

  logStep(title, details) {
    this.addSection(title, `<p class="text-gray-600">${details}</p>`);
  }

  logSuccess(details) {
    this.addSection(
      "Success! Optimal plan found",
      `<p class="text-green-700 font-semibold">${details}</p>`
    );
  }

  logError(title, details) {
    this.addSection(
      title,
      `<p class="text-red-600 font-semibold">${details}</p>`
    );
  }

  logTable(
    title,
    details,
    plan,
    costs,
    supplies,
    demands,
    currentSupplies,
    currentDemands,
    highlightCell = null
  ) {
    const m = plan.length;
    const n = plan[0].length;
    let html = `<p class="text-gray-600 mb-4">${details}</p>`;
    html += `<div class="step-table overflow-x-auto"><table class="w-full text-sm">
      <thead class="bg-gray-100"><tr><th></th>${Array.from(
        { length: n },
        (_, j) => `<th>C ${j + 1}</th>`
      ).join("")}<th>Supply (aᵢ)</th></tr></thead>
      <tbody>`;

    for (let i = 0; i < m; i++) {
      html += `<tr class="${
        highlightCell && highlightCell.minRow === i ? "bg-red-50" : ""
      }">
        <td class="font-bold text-blue-700">A ${i + 1}</td>
        ${Array.from({ length: n }, (_, j) => {
          const cost = costs[i][j];
          const allocation = plan[i][j];
          const highlight =
            highlightCell &&
            highlightCell.minRow === i &&
            highlightCell.minCol === j;
          return `<td class="relative p-3 ${highlight ? "bg-red-200" : ""}">
            <div class="cost">${cost}</div>
            <div class="allocation">${
              allocation !== null ? parseFloat(allocation.toFixed(2)) : "-"
            }</div>
          </td>`;
        }).join("")}
        <td class="font-bold text-red-700 bg-red-50">${
          currentSupplies[i] > EPSILON
            ? `(${currentSupplies[i].toFixed(0)})`
            : supplies[i].toFixed(0)
        }</td>
      </tr>`;
    }

    html += `<tr class="bg-green-50"><td class="font-bold text-green-700">Demand (bⱼ)</td>
      ${Array.from(
        { length: n },
        (_, j) =>
          `<td class="font-bold text-green-700">${
            currentDemands[j] > EPSILON
              ? `(${currentDemands[j].toFixed(0)})`
              : demands[j].toFixed(0)
          }</td>`
      ).join("")}
      <td></td></tr>`;

    html += `</tbody></table></div>`;
    this.addSection(title, html);
  }

  logPotentials(plan, costs, supplies, demands, u, v) {
    const m = plan.length;
    const n = plan[0].length;

    let html = `<div class="step-table overflow-x-auto"><table class="w-full text-sm text-center border-collapse">
      <thead><tr class="bg-gray-100">
        <th class="border p-2">u\\v</th>
        ${Array.from(
          { length: n },
          (_, j) =>
            `<th class="border p-2">v${j + 1}=${
              v[j] !== null ? v[j].toFixed(1) : " "
            }</th>`
        ).join("")}
      </tr></thead><tbody>`;

    for (let i = 0; i < m; i++) {
      html += `<tr>
        <td class="border p-2 font-bold">u${i + 1}=${
        u[i] !== null ? u[i].toFixed(1) : ""
      }</td>
        ${Array.from({ length: n }, (_, j) => {
          const allocation = plan[i][j];
          const value = allocation !== null ? allocation.toFixed(1) : "-";
          return `<td class="border p-2">${value}</td>`;
        }).join("")}
      </tr>`;
    }
    html += `</tbody></table></div>`;
    this.addSection("Table with Potentials (u, v):", html);
  }

  logDeltas(plan, costs, supplies, demands, deltas) {
    const m = plan.length;
    const n = plan[0].length;

    // Build header row
    let html = `<div class="step-table overflow-x-auto"><table class="w-full text-sm border-collapse">
      <thead><tr class="bg-gray-100">
        <th class="border p-2"></th>
        ${Array.from(
          { length: n },
          (_, j) => `<th class="border p-2">Consumer ${j + 1}</th>`
        ).join("")}
        <th class="border p-2">Supply</th>
      </tr></thead>
      <tbody>`;

    // Build data rows
    for (let i = 0; i < m; i++) {
      html += `<tr>
        <td class="border p-2 font-bold">Supplier ${i + 1}</td>
        ${Array.from({ length: n }, (_, j) => {
          const delta = deltas[i][j];
          const allocation = plan[i][j];
          const isFilled = allocation !== null;

          let value = "-";
          if (!isFilled && delta !== null) {
            value = delta.toFixed(2);
          } else if (isFilled) {
            value = `(${allocation.toFixed(1)})`;
          }

          return `<td class="border p-2">${value}</td>`;
        }).join("")}
        <td class="border p-2">${supplies[i].toFixed(0)}</td>
      </tr>`;
    }

    // Build demand row
    html += `<tr class="bg-green-50">
      <td class="border p-2 font-bold">Demand</td>
      ${Array.from(
        { length: n },
        (_, j) =>
          `<td class="border p-2 font-bold">${demands[j].toFixed(0)}</td>`
      ).join("")}
      <td class="border p-2 font-bold">${demands
        .reduce((a, b) => a + b, 0)
        .toFixed(0)}</td>
    </tr>`;

    html += `</tbody></table></div>`;

    this.addSection("Checking empty cells for optimality (Δ values):", html);
  }

  logCycle(cycle, plan, costs, supplies, demands) {
    const m = plan.length;
    const n = plan[0].length;

    let html = `<div class="step-table overflow-x-auto"><table class="w-full text-sm border-collapse">
      <thead><tr class="bg-gray-100">
        <th class="border p-2"></th>
        ${Array.from(
          { length: n },
          (_, j) => `<th class="border p-2">Consumer ${j + 1}</th>`
        ).join("")}
        <th class="border p-2">Supply</th>
      </tr></thead>
      <tbody>`;

    for (let i = 0; i < m; i++) {
      html += `<tr>
        <td class="border p-2 font-bold">Supplier ${i + 1}</td>
        ${Array.from({ length: n }, (_, j) => {
          const allocation = plan[i][j];
          const cycleIndex = cycle.findIndex((c) => c.row === i && c.col === j);

          let value = allocation !== null ? allocation.toFixed(1) : "-";
          if (cycleIndex !== -1) {
            const sign = cycleIndex % 2 === 0 ? "(+)" : "(-)";
            value += sign;
          }

          return `<td class="border p-2">${value}</td>`;
        }).join("")}
        <td class="border p-2">${supplies[i].toFixed(0)}</td>
      </tr>`;
    }

    // Build demand row
    html += `<tr class="bg-green-50">
      <td class="border p-2 font-bold">Demand</td>
      ${Array.from(
        { length: n },
        (_, j) =>
          `<td class="border p-2 font-bold">${demands[j].toFixed(0)}</td>`
      ).join("")}
      <td class="border p-2 font-bold">${demands
        .reduce((a, b) => a + b, 0)
        .toFixed(0)}</td>
    </tr>`;

    html += `</tbody></table></div>`;

    this.addSection("Building reallocation cycle:", html);
  }

  logFinalPlan(
    title,
    plan,
    costs,
    supplies,
    demands,
    totalCost,
    isSupplyDummy = false,
    isDemandDummy = false
  ) {
    const m = plan.length;
    const n = plan[0].length;

    // Build header
    let html = `<div class="step-table overflow-x-auto"><table class="w-full text-sm border-collapse">
      <thead><tr class="bg-gray-100">
        <th class="border p-2"></th>
        ${Array.from(
          { length: n },
          (_, j) => `<th class="border p-2">Consumer ${j + 1}</th>`
        ).join("")}
        <th class="border p-2">Supply</th>
      </tr></thead>
      <tbody>`;

    // Build data rows (C# format: Supplier X | value | value | ... | Supply)
    for (let i = 0; i < m; i++) {
      html += `<tr>
        <td class="border p-2 font-bold">Supplier ${i + 1}</td>
        ${Array.from({ length: n }, (_, j) => {
          const allocation = plan[i][j];
          const value = allocation !== null ? allocation.toFixed(1) : "-";
          return `<td class="border p-2">${value}</td>`;
        }).join("")}
        <td class="border p-2">${supplies[i].toFixed(0)}</td>
      </tr>`;
    }

    // Build demand row
    html += `<tr class="bg-green-50">
      <td class="border p-2 font-bold">Demand</td>
      ${Array.from(
        { length: n },
        (_, j) =>
          `<td class="border p-2 font-bold">${demands[j].toFixed(0)}</td>`
      ).join("")}
      <td class="border p-2 font-bold">${demands
        .reduce((a, b) => a + b, 0)
        .toFixed(0)}</td>
    </tr>`;

    html += `</tbody></table></div>`;
    html += `<p class="mt-4 font-bold">Total Cost for this Plan (Z) = ${totalCost.toFixed(
      2
    )}</p>`;

    this.addSection(title, html);
  }
}
