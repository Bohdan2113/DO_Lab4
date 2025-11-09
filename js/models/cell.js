// Cell model for representing matrix positions

export class Cell {
  constructor(row, col) {
    this.row = row;
    this.col = col;
  }

  toString() {
    return `(${this.row + 1}, ${this.col + 1})`;
  }

  equals(other) {
    return other !== null && this.row === other.row && this.col === other.col;
  }
}

