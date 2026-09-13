/**
 * Pure domain logic for BikeVault Financial Calculations.
 * Computes TCO, per-km, per-hour, per-month metrics with zero floating-point corruption.
 */

export interface TransactionSummaryItem {
  type: "EXPENSE" | "INCOME";
  amount: number;
}

export interface TcoInput {
  transactions: TransactionSummaryItem[];
  currentKm: number;
  currentMinutes: number;
  purchaseDate: Date | string;
  soldDate?: Date | string | null;
}

export interface TcoMetrics {
  totalExpenses: number;
  totalIncomes: number;
  netOwnershipCost: number;
  costPerKm: number | null;
  costPerHour: number | null;
  costPerMonth: number;
  ownershipMonths: number;
}

export function calculateTco(input: TcoInput): TcoMetrics {
  let totalExpenses = 0;
  let totalIncomes = 0;

  for (const tx of input.transactions) {
    const amt = Number(tx.amount);
    if (!isNaN(amt)) {
      if (tx.type === "EXPENSE") {
        totalExpenses += amt;
      } else if (tx.type === "INCOME") {
        totalIncomes += amt;
      }
    }
  }

  // Round to 2 decimal places to avoid floating point imprecision
  totalExpenses = Math.round(totalExpenses * 100) / 100;
  totalIncomes = Math.round(totalIncomes * 100) / 100;
  const netOwnershipCost = Math.round((totalExpenses - totalIncomes) * 100) / 100;

  // Cost per km
  const costPerKm = input.currentKm > 0 
    ? Math.round((netOwnershipCost / input.currentKm) * 100) / 100 
    : null;

  // Cost per hour
  const hours = input.currentMinutes / 60;
  const costPerHour = hours > 0 
    ? Math.round((netOwnershipCost / hours) * 100) / 100 
    : null;

  // Ownership duration in months
  const startDate = new Date(input.purchaseDate);
  const endDate = input.soldDate ? new Date(input.soldDate) : new Date();
  const diffTime = Math.max(0, endDate.getTime() - startDate.getTime());
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  const rawMonths = diffDays / 30.4375;
  const ownershipMonths = Math.max(1, Math.round(rawMonths * 10) / 10);

  const costPerMonth = Math.round((netOwnershipCost / ownershipMonths) * 100) / 100;

  return {
    totalExpenses,
    totalIncomes,
    netOwnershipCost,
    costPerKm,
    costPerHour,
    costPerMonth,
    ownershipMonths,
  };
}

export function calculateUpgradeCost(newComponentPrice: number, oldComponentSalePrice: number): number {
  return Math.round((newComponentPrice - oldComponentSalePrice) * 100) / 100;
}
