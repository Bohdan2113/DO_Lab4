const LOCAL_EPSILON = 1e-4;
const MAX_ITERATIONS = 50;

class TransportData {
  constructor(costs, supplies, demands) {
    this.costs = costs.map((row) => [...row]);
    this.supplies = [...supplies];
    this.demands = [...demands];
    this.suppliers = this.supplies.length;
    this.consumers = this.demands.length;
  }

  get totalSupply() {
    return this.supplies.reduce((acc, value) => acc + value, 0);
  }

  get totalDemand() {
    return this.demands.reduce((acc, value) => acc + value, 0);
  }

  isBalanced() {
    return Math.abs(this.totalSupply - this.totalDemand) < LOCAL_EPSILON;
  }
}

export class DifferentialRentMethod {
  constructor(costs, supplies, demands, logger) {
    this.logger = logger;
    this.data = new TransportData(costs, supplies, demands);
  }

  solve() {
    this.logger.logHeader(
      "=== ТРАНСПОРТНА ЗАДАЧА ===",
      "Метод диференціальних рент"
    );
    this.logInitialData();

    if (!this.data.isBalanced()) {
      this.logger.logError(
        "Перевірка балансу",
        `Задача незбалансована. Сума запасів: ${this.data.totalSupply.toFixed(
          1
        )}, сума потреб: ${this.data.totalDemand.toFixed(1)}.`
      );
      return null;
    }

    const solver = new DifferentialRentSolver(this.data, this.logger);
    const solution = solver.solve();

    if (solution) {
      this.logFinalSolution(solution.allocations, solution.totalCost);
    } else {
      this.logger.logError(
        "Результат",
        "Не вдалося знайти оптимальний розв'язок методом диференціальних рент."
      );
    }

    return solution;
  }

  logInitialData() {
    const { suppliers, consumers, costs, supplies, demands } = this.data;
    let html = `<div class="step-table overflow-x-auto"><table class="w-full text-sm border-collapse">
      <thead><tr class="bg-gray-100">
        <th class="border p-2"></th>
        ${Array.from(
          { length: consumers },
          (_, j) => `<th class="border p-2">Спож ${j + 1}</th>`
        ).join("")}
        <th class="border p-2">Запаси</th>
      </tr></thead><tbody>`;

    for (let i = 0; i < suppliers; i++) {
      html += `<tr>
        <td class="border p-2 font-semibold">S${i + 1}</td>
        ${Array.from(
          { length: consumers },
          (_, j) => `<td class="border p-2">${costs[i][j].toFixed(1)}</td>`
        ).join("")}
        <td class="border p-2 font-semibold">${supplies[i].toFixed(1)}</td>
      </tr>`;
    }

    html += `<tr class="bg-green-50">
      <td class="border p-2 font-semibold">Потреби</td>
      ${Array.from(
        { length: consumers },
        (_, j) => `<td class="border p-2">${demands[j].toFixed(1)}</td>`
      ).join("")}
      <td class="border p-2 font-semibold">${this.data.totalSupply.toFixed(
        1
      )} / ${this.data.totalDemand.toFixed(1)}</td>
    </tr></tbody></table></div>`;

    const balanceText = this.data.isBalanced()
      ? "Задача збалансована."
      : "Задача незбалансована!";

    this.logger.addSection(
      "Вихідні дані",
      `<p class="text-gray-600 mb-4">${balanceText}</p>${html}`
    );
  }

  logFinalSolution(allocation, totalCost) {
    const plan = allocation.map((row) =>
      row.map((value) => (value > LOCAL_EPSILON ? value : null))
    );

    this.logger.logSuccess(
      `Знайдено оптимальний план перевезень методом диференціальних рент.`
    );
    this.logger.logFinalPlan(
      "Оптимальний план перевезень",
      plan,
      this.data.costs,
      this.data.supplies,
      this.data.demands,
      totalCost
    );
  }
}

class DifferentialRentSolver {
  constructor(data, logger) {
    this.data = data;
    this.logger = logger;
    this.currentCosts = data.costs.map((row) => [...row]);
    this.iterationNumber = 0;
  }

  solve() {
    let iteration = 1;

    while (iteration <= MAX_ITERATIONS) {
      this.iterationNumber = iteration;
      
      this.logger.logHeader(
        `Ітерація ${iteration}`,
        "Побудова умовно оптимального розподілу"
      );

      const allocation = this.buildConditionalOptimalAllocation();
      this.logIterationTable(allocation);

      const totalAllocated = this.getTotalAllocated(allocation);
      this.logger.logStep(
        "Проміжний результат",
        `Розподілено ${totalAllocated.toFixed(
          1
        )} з ${this.data.totalSupply.toFixed(1)}.`
      );

      if (this.isFeasible(allocation)) {
        this.logger.logSuccess(
          "План допустимий! Оптимальний розв'язок знайдено."
        );
        return {
          allocations: allocation,
          totalCost: this.calculateCost(allocation),
        };
      }

      const { surplus, deficit } = this.determineRowTypes(allocation);
      this.printRowTypes(surplus, deficit);

      const minRent = this.calculateMinimumRent(allocation, surplus, deficit);

      if (!Number.isFinite(minRent)) {
        this.logger.logError(
          "Проміжна рента",
          "Не вдалося знайти коректну проміжну ренту для подальшого покращення плану."
        );
        return null;
      }

      this.logger.logStep(
        "Оновлення тарифів",
        minRent > LOCAL_EPSILON
          ? `Проміжна рента: ${minRent.toFixed(
              2
            )}. Додаємо її до тарифів недостатніх рядків.`
          : `Проміжна рента: ${minRent.toFixed(
              2
            )}. Тарифи не змінюються, але змінюється схема заповнення (більше обведених клітинок).`
      );
      
      if (minRent > LOCAL_EPSILON) {
        this.updateCosts(deficit, minRent);
      }

      iteration++;
    }

    this.logger.logError(
      "Обмеження ітерацій",
      "Досягнуто максимальну кількість ітерацій без знаходження допустимого плану."
    );
    return null;
  }

  buildConditionalOptimalAllocation() {
    const { suppliers, consumers } = this.data;
    const allocation = Array.from({ length: suppliers }, () =>
      Array(consumers).fill(0)
    );
    const remainingSupply = [...this.data.supplies];
    const remainingDemand = [...this.data.demands];

    // Крок 1: Знаходимо мінімальні тарифи в кожному стовпці
    // На першій ітерації - один мінімум на стовпець
    // На другій і наступних - всі мінімуми
    const minCells = [];
    
    for (let j = 0; j < consumers; j++) {
      let minCost = Infinity;
      const minRows = [];
      
      for (let i = 0; i < suppliers; i++) {
        const cost = this.currentCosts[i][j];
        if (cost < minCost - LOCAL_EPSILON) {
          minCost = cost;
          minRows.length = 0;
          minRows.push(i);
        } else if (Math.abs(cost - minCost) < LOCAL_EPSILON) {
          minRows.push(i);
        }
      }
      
      // На першій ітерації - вибираємо один мінімум
      if (this.iterationNumber === 1 && minRows.length > 1) {
        // Вибираємо рядок з найбільшими запасами
        const selectedRow = minRows.reduce((best, current) => {
          return this.data.supplies[current] > this.data.supplies[best] ? current : best;
        });
        minCells.push({ row: selectedRow, col: j, cost: minCost });
      } else {
        // На другій і наступних ітераціях - додаємо всі мінімуми
        for (const row of minRows) {
          minCells.push({ row, col: j, cost: minCost });
        }
      }
    }

    // Логування мінімальних тарифів
    if (minCells.length > 0) {
      const grouped = new Map();
      minCells.forEach((cell) => {
        if (!grouped.has(cell.col)) {
          grouped.set(cell.col, {
            cost: cell.cost,
            rows: [`S${cell.row + 1}`],
          });
        } else {
          grouped.get(cell.col).rows.push(`S${cell.row + 1}`);
        }
      });

      const minTariffHtml = Array.from(grouped.entries())
        .map(
          ([col, info]) =>
            `<li>Стовпець ${Number(col) + 1}: тариф ${info.cost.toFixed(
              1
            )} у рядках ${info.rows.join(", ")}</li>`
        )
        .join("");

      if (minTariffHtml) {
        this.logger.addSection(
          "Мінімальні тарифи в стовпцях",
          `<ul class="list-disc pl-6 text-gray-600">${minTariffHtml}</ul>`
        );
      }
    }

    const assignmentMessages = [];
    const processedCells = new Set();

    // Крок 2: Заповнюємо клітинки за алгоритмом з методички
    const maxPasses = 20;
    for (let pass = 0; pass < maxPasses; pass++) {
      let changed = false;

      // Спочатку заповнюємо клітинки, які є єдиними в стовпцях
      for (let j = 0; j < consumers; j++) {
        if (remainingDemand[j] < LOCAL_EPSILON) continue;

        const availableCells = minCells.filter(
          (cell) =>
            cell.col === j &&
            remainingSupply[cell.row] > LOCAL_EPSILON &&
            !processedCells.has(`${cell.row}-${cell.col}`)
        );

        if (availableCells.length === 1) {
          const cell = availableCells[0];
          const amount = Math.min(
            remainingSupply[cell.row],
            remainingDemand[cell.col]
          );

          if (amount > LOCAL_EPSILON) {
            allocation[cell.row][cell.col] += amount;
            remainingSupply[cell.row] -= amount;
            remainingDemand[cell.col] -= amount;
            processedCells.add(`${cell.row}-${cell.col}`);
            assignmentMessages.push(
              `Заповнюємо клітинку [${cell.row + 1}, ${
                cell.col + 1
              }] величиною ${amount.toFixed(1)} (єдина в стовпці).`
            );
            changed = true;
          }
        }
      }

      // Потім заповнюємо клітинки, які є єдиними в рядках
      for (let i = 0; i < suppliers; i++) {
        if (remainingSupply[i] < LOCAL_EPSILON) continue;

        const availableCells = minCells.filter(
          (cell) =>
            cell.row === i &&
            remainingDemand[cell.col] > LOCAL_EPSILON &&
            !processedCells.has(`${cell.row}-${cell.col}`)
        );

        if (availableCells.length === 1) {
          const cell = availableCells[0];
          const amount = Math.min(
            remainingSupply[cell.row],
            remainingDemand[cell.col]
          );

          if (amount > LOCAL_EPSILON) {
            allocation[cell.row][cell.col] += amount;
            remainingSupply[cell.row] -= amount;
            remainingDemand[cell.col] -= amount;
            processedCells.add(`${cell.row}-${cell.col}`);
            assignmentMessages.push(
              `Заповнюємо клітинку [${cell.row + 1}, ${
                cell.col + 1
              }] величиною ${amount.toFixed(1)} (єдина в рядку).`
            );
            changed = true;
          }
        }
      }

      // Якщо немає змін, заповнюємо довільну клітинку з мінімальним тарифом
      if (!changed) {
        const sortedCells = [...minCells]
          .filter(
            (cell) =>
              remainingSupply[cell.row] > LOCAL_EPSILON &&
              remainingDemand[cell.col] > LOCAL_EPSILON &&
              !processedCells.has(`${cell.row}-${cell.col}`)
          )
          .sort((a, b) => {
            if (Math.abs(a.cost - b.cost) > LOCAL_EPSILON) {
              return a.cost - b.cost;
            }
            const supplyDiff = remainingSupply[b.row] - remainingSupply[a.row];
            if (Math.abs(supplyDiff) > LOCAL_EPSILON) {
              return supplyDiff;
            }
            return a.row - b.row;
          });

        if (sortedCells.length > 0) {
          const cell = sortedCells[0];
          const amount = Math.min(
            remainingSupply[cell.row],
            remainingDemand[cell.col]
          );

          allocation[cell.row][cell.col] += amount;
          remainingSupply[cell.row] -= amount;
          remainingDemand[cell.col] -= amount;
          processedCells.add(`${cell.row}-${cell.col}`);
          assignmentMessages.push(
            `Заповнюємо клітинку [${cell.row + 1}, ${
              cell.col + 1
            }] величиною ${amount.toFixed(1)}.`
          );
          changed = true;
        }
      }

      if (!changed) break;
    }

    if (assignmentMessages.length > 0) {
      const html = `<ul class="list-disc pl-6 text-gray-600">${assignmentMessages
        .map((msg) => `<li>${msg}</li>`)
        .join("")}</ul>`;
      this.logger.addSection("Заповнення клітинок", html);
    }

    return allocation;
  }

  logIterationTable(allocation) {
    const { suppliers, consumers } = this.data;
    let html = `<div class="step-table overflow-x-auto"><table class="w-full text-sm border-collapse">
      <thead><tr class="bg-gray-100">
        <th class="border p-2"></th>
        ${Array.from(
          { length: consumers },
          (_, j) => `<th class="border p-2">Спож ${j + 1}</th>`
        ).join("")}
        <th class="border p-2">Запаси</th>
      </tr></thead><tbody>`;

    for (let i = 0; i < suppliers; i++) {
      html += `<tr>
        <td class="border p-2 font-semibold">S${i + 1}</td>
        ${Array.from({ length: consumers }, (_, j) => {
          const allocationValue = allocation[i][j];
          const tariff = this.currentCosts[i][j];
          return `<td class="border p-2">
              ${
                allocationValue > LOCAL_EPSILON
                  ? `${allocationValue.toFixed(
                      1
                    )} <span class="text-gray-500">(${tariff.toFixed(
                      1
                    )})</span>`
                  : `<span class="text-gray-500">${tariff.toFixed(1)}</span>`
              }
            </td>`;
        }).join("")}
        <td class="border p-2 font-semibold">${this.data.supplies[i].toFixed(
          1
        )}</td>
      </tr>`;
    }

    html += `<tr class="bg-green-50">
      <td class="border p-2 font-semibold">Потреби</td>
      ${Array.from(
        { length: consumers },
        (_, j) =>
          `<td class="border p-2">${this.data.demands[j].toFixed(1)}</td>`
      ).join("")}
      <td class="border p-2 font-semibold"></td>
    </tr></tbody></table></div>`;

    this.logger.addSection("Таблиця розподілу", html);
  }

  getTotalAllocated(allocation) {
    return allocation.reduce(
      (sum, row) => sum + row.reduce((rowSum, value) => rowSum + value, 0),
      0
    );
  }

  isFeasible(allocation) {
    for (let i = 0; i < this.data.suppliers; i++) {
      const rowSum = allocation[i].reduce((acc, value) => acc + value, 0);
      if (Math.abs(rowSum - this.data.supplies[i]) > LOCAL_EPSILON) {
        return false;
      }
    }

    for (let j = 0; j < this.data.consumers; j++) {
      let columnSum = 0;
      for (let i = 0; i < this.data.suppliers; i++) {
        columnSum += allocation[i][j];
      }
      if (Math.abs(columnSum - this.data.demands[j]) > LOCAL_EPSILON) {
        return false;
      }
    }

    return true;
  }

  determineRowTypes(allocation) {
    const surplus = [];
    const deficit = [];

    // Визначаємо для кожного рядка: скільки розподілено та скільки залишилось
    for (let i = 0; i < this.data.suppliers; i++) {
      const allocated = allocation[i].reduce((acc, value) => acc + value, 0);
      const remaining = this.data.supplies[i] - allocated;

      // Рядок надлишковий, якщо є нерозподілені запаси
      if (remaining > LOCAL_EPSILON) {
        surplus.push(i);
        continue;
      }

      // Якщо залишок близький до 0, потрібно перевірити чи рядок недостатній
      if (Math.abs(remaining) < LOCAL_EPSILON) {
        // Перевіряємо чи є незадоволені потреби в стовпцях з мінімальними тарифами цього рядка
        let isDeficit = false;

        for (let j = 0; j < this.data.consumers; j++) {
          // Перевіряємо чи потреба в стовпці j задоволена
          let columnSum = 0;
          for (let k = 0; k < this.data.suppliers; k++) {
            columnSum += allocation[k][j];
          }

          // Якщо потреба не задоволена
          if (columnSum < this.data.demands[j] - LOCAL_EPSILON) {
            // Перевіряємо чи рядок i має мінімальний тариф в цьому стовпці
            let minCost = Infinity;
            for (let k = 0; k < this.data.suppliers; k++) {
              minCost = Math.min(minCost, this.currentCosts[k][j]);
            }

            if (Math.abs(this.currentCosts[i][j] - minCost) < LOCAL_EPSILON) {
              isDeficit = true;
              break;
            }
          }
        }

        if (isDeficit) {
          deficit.push(i);
        } else {
          surplus.push(i);
        }
      }
    }

    return { surplus, deficit };
  }

  printRowTypes(surplus, deficit) {
    const html = `
      <p class="text-gray-600 mb-2">Класифікація рядків:</p>
      <ul class="list-disc pl-6 text-gray-600">
        <li>Надлишкові рядки: ${
          surplus.length > 0
            ? surplus.map((i) => `S${i + 1}`).join(", ")
            : "немає"
        }</li>
        <li>Недостатні рядки: ${
          deficit.length > 0
            ? deficit.map((i) => `S${i + 1}`).join(", ")
            : "немає"
        }</li>
      </ul>`;
    this.logger.addSection("Визначення типів рядків", html);
  }

  calculateMinimumRent(allocation, surplus, deficit) {
    const messages = [];
    let minRent = Infinity;

    // Для кожного стовпця обчислюємо ренту
    for (let j = 0; j < this.data.consumers; j++) {
      // Перевіряємо чи обведений тариф знаходиться у недостатньому рядку
      let deficitMinCost = Infinity;
      let hasDeficitMin = false;

      // Знаходимо мінімальний тариф серед всіх рядків
      let globalMinCost = Infinity;
      for (let i = 0; i < this.data.suppliers; i++) {
        globalMinCost = Math.min(globalMinCost, this.currentCosts[i][j]);
      }

      // Перевіряємо чи цей мінімум у недостатньому рядку
      for (const deficitRow of deficit) {
        if (Math.abs(this.currentCosts[deficitRow][j] - globalMinCost) < LOCAL_EPSILON) {
          deficitMinCost = globalMinCost;
          hasDeficitMin = true;
          break;
        }
      }

      // Якщо обведений тариф НЕ у від'ємному рядку - різницю не визначаємо
      if (!hasDeficitMin) {
        continue;
      }

      // Знаходимо найближчий (за значенням) тариф у надлишковому рядку
      let nearestSurplusCost = Infinity;
      let minDifference = Infinity;

      for (const surplusRow of surplus) {
        const cost = this.currentCosts[surplusRow][j];
        const difference = Math.abs(cost - deficitMinCost);
        
        // Шукаємо найближчий за значенням тариф (може бути рівним або більшим)
        if (cost >= deficitMinCost - LOCAL_EPSILON && difference < minDifference) {
          minDifference = difference;
          nearestSurplusCost = cost;
        }
      }

      // Обчислюємо ренту
      if (nearestSurplusCost !== Infinity) {
        const rent = nearestSurplusCost - deficitMinCost;
        messages.push(
          `Стовпець ${j + 1}: ${nearestSurplusCost.toFixed(
            1
          )} - ${deficitMinCost.toFixed(1)} = ${rent.toFixed(2)}`
        );
        minRent = Math.min(minRent, rent);
      }
    }

    if (messages.length > 0) {
      const html = `<ul class="list-disc pl-6 text-gray-600">${messages
        .map((msg) => `<li>${msg}</li>`)
        .join("")}</ul>`;
      this.logger.addSection("Обчислення рент", html);
    }

    return minRent;
  }

  updateCosts(deficitRows, rent) {
    deficitRows.forEach((row) => {
      for (let j = 0; j < this.data.consumers; j++) {
        this.currentCosts[row][j] += rent;
      }
    });
  }

  calculateCost(allocation) {
    let total = 0;

    for (let i = 0; i < this.data.suppliers; i++) {
      for (let j = 0; j < this.data.consumers; j++) {
        total += allocation[i][j] * this.data.costs[i][j];
      }
    }

    return total;
  }
}