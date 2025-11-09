export const METHOD_IDS = {
  POTENTIAL: "potential-method",
  DIFFERENTIAL_RENT: "differential-rent-method",
};

export const SOLVER_METHODS = [
  {
    id: METHOD_IDS.POTENTIAL,
    label: "Метод потенціалів",
    description:
      "Класичний метод потенціалів (MODI) для покращення початкового плану до оптимального.",
  },
  {
    id: METHOD_IDS.DIFFERENTIAL_RENT,
    label: "Метод диференціальних рент",
    description:
      "Алгоритм диференціальних рент, що ітеративно коригує тарифи та будує умовно оптимальні розподіли.",
  },
];

export const DEFAULT_METHOD_ID = METHOD_IDS.POTENTIAL;
