// Module for reading and parsing JSON files

export class JSONFileReader {
  /**
   * Reads a JSON file and returns TransportationData
   */
  static async readJSONFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result;
          const data = JSON.parse(text);

          if (
            !data.costs ||
            !data.supplies ||
            !data.demands ||
            data.costs.length === 0
          ) {
            throw new Error(
              "JSON must contain fields: costs (matrix), supplies (supply), demands (demand)."
            );
          }

          // Validate structure
          const m = data.supplies.length;
          const n = data.demands.length;
          if (
            data.costs.length !== m ||
            data.costs.some((row) => row.length !== n)
          ) {
            throw new Error(
              "Cost matrix dimensions do not match supplies and demands sizes."
            );
          }

          resolve({
            costs: data.costs,
            supplies: data.supplies,
            demands: data.demands,
          });
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsText(file);
    });
  }
}
