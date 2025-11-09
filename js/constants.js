// Constants for the Transportation Problem Solver

export const MIN_COST_ROWS = 4;
export const MIN_COST_COLS = 4;
export const EPSILON = 1e-9;
export const MAX_ITERATIONS = 10;

// JSON file names
export const JSON_FILES = {
  DEFAULT: "default.json",
  EXAMPLE_1: "example1.json",
  EXAMPLE_2: "example2.json",
};

// Default data
export const DEFAULT_COSTS = [
  [4, 9, 1, 3],
  [2, 5, 5, 6],
  [2, 5, 10, 4],
  [3, 7, 2, 6],
];

export const DEFAULT_SUPPLIES = [43, 20, 30, 32];
export const DEFAULT_DEMANDS = [18, 50, 22, 35];

// DOM element IDs
export const DOM_IDS = {
  MATRIX_CONTAINER: "matrix-container",
  OUTPUT_CONTAINER: "output-container",
  SOLVE_BUTTON: "solve-button",
  METHOD_SELECT: "method-select",
  METHOD_DESCRIPTION: "method-description",
  JSON_UPLOAD: "json-upload",
  FILE_STATUS: "file-status",
  MESSAGE_BOX: "message-box",
  MESSAGE_TITLE: "message-title",
  MESSAGE_BODY: "message-body",
  ADD_SUPPLIER: "add-supplier",
  ADD_CONSUMER: "add-consumer",
  TOTAL_BALANCE: "total-balance",
};
