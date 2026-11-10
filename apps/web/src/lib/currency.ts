export interface CurrencyInfo {
  code: string;
  symbol: string;
  flag: string;
  name: string;
  min: number;
  max: number;
  step: number;
  defaultAmount: number;
}

export const CURRENCIES: CurrencyInfo[] = [
  { code: "NGN", symbol: "₦", flag: "🇳🇬", name: "Nigerian Naira", min: 10000, max: 2000000, step: 10000, defaultAmount: 150000 },
  { code: "USD", symbol: "$", flag: "🇺🇸", name: "US Dollar", min: 50, max: 3000, step: 50, defaultAmount: 250 },
  { code: "GBP", symbol: "£", flag: "🇬🇧", name: "British Pound", min: 40, max: 2500, step: 20, defaultAmount: 200 },
  { code: "EUR", symbol: "€", flag: "🇪🇺", name: "Euro", min: 45, max: 2800, step: 25, defaultAmount: 220 },
  { code: "GHS", symbol: "GH₵", flag: "🇬🇭", name: "Ghanaian Cedi", min: 500, max: 30000, step: 500, defaultAmount: 3000 },
  { code: "KES", symbol: "KSh", flag: "🇰🇪", name: "Kenyan Shilling", min: 5000, max: 300000, step: 2500, defaultAmount: 30000 },
  { code: "ZAR", symbol: "R", flag: "🇿🇦", name: "South African Rand", min: 800, max: 50000, step: 500, defaultAmount: 4500 },
];

export const EXCHANGE_RATES: Record<string, number> = {
  USD: 1.0,
  NGN: 1500.0,
  GBP: 0.8,
  EUR: 0.92,
  GHS: 15.0,
  KES: 130.0,
  ZAR: 18.0,
};

export const SYMBOL_TO_CODE: Record<string, string> = {
  "₦": "NGN",
  "$": "USD",
  "£": "GBP",
  "€": "EUR",
  "GH₵": "GHS",
  "KSh": "KES",
  "R": "ZAR",
};

export const CODE_TO_SYMBOL: Record<string, string> = {
  NGN: "₦",
  USD: "$",
  GBP: "£",
  EUR: "€",
  GHS: "GH₵",
  KES: "KSh",
  ZAR: "R",
};

export function convertCurrency(amount: number, fromCode: string, toCode: string): number {
  // Normalize symbol inputs if any were passed
  const from = SYMBOL_TO_CODE[fromCode] || fromCode;
  const to = SYMBOL_TO_CODE[toCode] || toCode;

  const fromRate = EXCHANGE_RATES[from] || 1.0;
  const toRate = EXCHANGE_RATES[to] || 1.0;

  // Convert to USD base first, then to target
  const amountInUSD = amount / fromRate;
  return amountInUSD * toRate;
}

export interface LimitError {
  heading: string;
  subtext: string;
}

export function getRandomLimitError(isMobile: boolean): LimitError {
  const choice = Math.random() < 0.5 ? 0 : 1;
  if (isMobile) {
    return choice === 0
      ? { heading: "Amount too high", subtext: "That's a lot of zeros. Try again." }
      : { heading: "Too many zeros", subtext: "Even we're speechless. Try a smaller number." };
  } else {
    return choice === 0
      ? { heading: "Amount too high", subtext: "That's a little too ambitious. Please enter a smaller number." }
      : { heading: "Even Paystack has limits.", subtext: "Please enter an amount under 999,999,999,999,999." };
  }
}
