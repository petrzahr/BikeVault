import type { Bike, BikeVaultData, Component, FinancialTransaction } from "../../types/vault";

export interface PurchaseEditingOptions {
  now: string;
  generateTransactionId: () => string;
}

type Purchase = Pick<Component, "purchasePrice" | "purchaseDate" | "currency">;

function reconcilePurchase(
  transactions: FinancialTransaction[],
  entity: Purchase,
  matches: (transaction: FinancialTransaction) => boolean,
  attribution: Pick<FinancialTransaction, "bikeId" | "componentId" | "category" | "notes">,
  options: PurchaseEditingOptions,
): FinancialTransaction[] {
  // Preserve first-match semantics and any existing bike attribution.
  const existing = transactions.find(matches);
  const amount = Number(entity.purchasePrice || 0);
  if (amount <= 0) return transactions.filter((transaction) => transaction !== existing);
  const currency = entity.currency || "CZK";
  if (existing) {
    return transactions.map((transaction) => transaction === existing
      ? { ...transaction, amount, currency, transactionDate: entity.purchaseDate || transaction.transactionDate }
      : transaction);
  }
  return [{
    ...attribution,
    id: options.generateTransactionId(),
    type: "EXPENSE",
    amount,
    currency,
    transactionDate: entity.purchaseDate || options.now.split("T")[0],
    createdAt: options.now,
  }, ...transactions];
}

function touchesPurchase(updates: Partial<Purchase>): boolean {
  return "purchasePrice" in updates || "purchaseDate" in updates || "currency" in updates;
}

export function updateBikeInData(data: BikeVaultData, id: string, updates: Partial<Bike>, options: PurchaseEditingOptions): BikeVaultData {
  const bikes = data.bikes.map((bike) => bike.id === id
    ? { ...bike, ...updates, id: bike.id, updatedAt: options.now } : bike);
  const bike = bikes.find((item) => item.id === id);
  if (!bike || !touchesPurchase(updates)) return { ...data, bikes };
  const financialTransactions = reconcilePurchase(data.financialTransactions, bike,
    (transaction) => transaction.bikeId === id && transaction.category === "BIKE_PURCHASE",
    { bikeId: id, category: "BIKE_PURCHASE", notes: `Pořízení kola ${bike.manufacturer} ${bike.model}` }, options);
  return { ...data, bikes, financialTransactions };
}

export function updateComponentInData(data: BikeVaultData, id: string, updates: Partial<Component>, options: PurchaseEditingOptions): BikeVaultData {
  const components = data.components.map((component) => component.id === id
    ? { ...component, ...updates, id: component.id, updatedAt: options.now } : component);
  const component = components.find((item) => item.id === id);
  if (!component || !touchesPurchase(updates)) return { ...data, components };
  const financialTransactions = reconcilePurchase(data.financialTransactions, component,
    (transaction) => transaction.componentId === id && transaction.category === "COMPONENT_PURCHASE",
    { componentId: id, category: "COMPONENT_PURCHASE", notes: `Nákup komponentu ${component.manufacturer} ${component.model}` }, options);
  return { ...data, components, financialTransactions };
}
