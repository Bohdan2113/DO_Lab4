// Main entry point for the Transportation Problem Solver

import { InputHandler } from "./ui/inputHandler.js";
import { JSONFileReader } from "./utils/fileReader.js";
import { Validator } from "./utils/validator.js";
import { Logger } from "./ui/logger.js";
import { TransportationProblemSolver } from "./core/solver.js";
import {
  DOM_IDS,
  DEFAULT_COSTS,
  DEFAULT_SUPPLIES,
  DEFAULT_DEMANDS,
} from "./constants.js";

let inputHandler;
let defaultCosts = DEFAULT_COSTS.map((row) => [...row]);
let defaultSupplies = [...DEFAULT_SUPPLIES];
let defaultDemands = [...DEFAULT_DEMANDS];

// Initialize the application
function init() {
  // Initialize MathJax for LaTeX display
  window.MathJax = {
    tex: {
      inlineMath: [
        ["$", "$"],
        ["\\(", "\\)"],
      ],
    },
    options: { renderActions: {} },
  };
  const script = document.createElement("script");
  script.src = "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js";
  script.id = "MathJax-script";
  document.head.appendChild(script);

  inputHandler = new InputHandler();

  // Render the initial matrix
  inputHandler.generateMatrixUI(defaultCosts, defaultSupplies, defaultDemands);
  inputHandler.updateBalanceDisplay();

  // Set up event listeners
  setupEventListeners();
}

function setupEventListeners() {
  // Solve button
  const solveButton = document.getElementById(DOM_IDS.SOLVE_BUTTON);
  if (solveButton) {
    solveButton.addEventListener("click", handleSolve);
  }

  // JSON upload
  const jsonUpload = document.getElementById(DOM_IDS.JSON_UPLOAD);
  if (jsonUpload) {
    jsonUpload.addEventListener("change", handleFileUpload);
  }

  // Add supplier button
  const addSupplier = document.getElementById(DOM_IDS.ADD_SUPPLIER);
  if (addSupplier) {
    addSupplier.addEventListener("click", () => {
      // Get current values from UI
      const currentData = inputHandler.parseInputMatrix();
      if (currentData) {
        defaultCosts = currentData.costs;
        defaultSupplies = currentData.supplies;
        defaultDemands = currentData.demands;
      }
      inputHandler.addSupplier(defaultCosts, defaultSupplies, defaultDemands);
      // Update defaults with new values
      const newData = inputHandler.parseInputMatrix();
      if (newData) {
        defaultCosts = newData.costs;
        defaultSupplies = newData.supplies;
        defaultDemands = newData.demands;
      }
    });
  }

  // Add consumer button
  const addConsumer = document.getElementById(DOM_IDS.ADD_CONSUMER);
  if (addConsumer) {
    addConsumer.addEventListener("click", () => {
      // Get current values from UI
      const currentData = inputHandler.parseInputMatrix();
      if (currentData) {
        defaultCosts = currentData.costs;
        defaultSupplies = currentData.supplies;
        defaultDemands = currentData.demands;
      }
      inputHandler.addConsumer(defaultCosts, defaultSupplies, defaultDemands);
      // Update defaults with new values
      const newData = inputHandler.parseInputMatrix();
      if (newData) {
        defaultCosts = newData.costs;
        defaultSupplies = newData.supplies;
        defaultDemands = newData.demands;
      }
    });
  }

  // Message box close button
  const messageBox = document.getElementById(DOM_IDS.MESSAGE_BOX);
  if (messageBox) {
    const closeButton = messageBox.querySelector("button");
    if (closeButton) {
      closeButton.addEventListener("click", () => {
        messageBox.classList.add("hidden");
        messageBox.classList.remove("flex");
      });
    }
  }
}

async function handleFileUpload(event) {
  const target = event.target;
  const file = target.files?.[0];
  if (!file) return;

  try {
    const data = await JSONFileReader.readJSONFile(file);
    const validationError = Validator.validateData(data);

    if (validationError) {
      inputHandler.showMessage("JSON Error", validationError);
      const fileStatus = document.getElementById(DOM_IDS.FILE_STATUS);
      if (fileStatus) fileStatus.textContent = "Error loading file.";
      return;
    }

    defaultCosts = data.costs;
    defaultSupplies = data.supplies;
    defaultDemands = data.demands;
    inputHandler.generateMatrixUI(
      defaultCosts,
      defaultSupplies,
      defaultDemands
    );

    const fileStatus = document.getElementById(DOM_IDS.FILE_STATUS);
    if (fileStatus) fileStatus.textContent = `Data loaded: ${file.name}`;
    inputHandler.showMessage("Success", "Data loaded from JSON file.", false);
  } catch (error) {
    const fileStatus = document.getElementById(DOM_IDS.FILE_STATUS);
    if (fileStatus) fileStatus.textContent = "Error loading file.";
    inputHandler.showMessage("JSON Error", error.message);
  }
}

function handleSolve() {
  const outputContainer = document.getElementById(DOM_IDS.OUTPUT_CONTAINER);
  if (!outputContainer) return;

  outputContainer.innerHTML =
    '<div class="text-center py-4 text-gray-500 font-semibold">Computing...</div>';

  const inputData = inputHandler.parseInputMatrix();
  if (!inputData) return;

  const validationError = Validator.validateData(inputData);
  if (validationError) {
    inputHandler.showMessage("Validation Error", validationError);
    return;
  }

  const logger = new Logger(outputContainer);

  try {
    const solver = new TransportationProblemSolver(
      inputData.costs,
      inputData.supplies,
      inputData.demands,
      logger
    );
    solver.solve();
  } catch (e) {
    console.error(e);
    logger.logError(
      "Critical Algorithm Error",
      `An unexpected error occurred during solving: ${e.message}`
    );
  }
}

// Initialize when DOM is loaded
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

