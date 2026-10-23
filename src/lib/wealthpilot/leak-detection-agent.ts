import type { Transaction } from '@/lib/types';
import { isEligibleExpense, normalizeDateToISO } from '@/lib/budget-calculations';
import type { DetectedLeak } from './types';

// Common Indian & Global subscription vendors/keywords
const SUBSCRIPTION_KEYWORDS = [
  'netflix', 'spotify', 'prime', 'hotstar', 'disney', 'youtube', 'apple', 'google storage', 
  'icloud', 'chatgpt', 'openai', 'gym', 'fitness', 'cult', 'timesprime', 'medium', 'linkedin',
  'sony liv', 'zee5', 'audible', 'kindle', 'membership', 'subscription'
];

// Avoidable fee indicators
const FEE_KEYWORDS = [
  'late fee', 'penalty', 'annual fee', 'atm surcharge', 'finance charge', 'overdraft', 
  'convenience fee', 'interest charge', 'statement charge', 'card renewal fee', 'bounce charge'
];

/**
 * Agent 1 — Leak Detection Agent
 * Evaluates real transaction logs and surfaces verifiable, high-confidence spending patterns.
 */
export function runLeakDetectionAgent(transactions: Transaction[]): DetectedLeak[] {
  const eligibleTransactions = transactions.filter(isEligibleExpense);
  const leaks: DetectedLeak[] = [];

  if (eligibleTransactions.length === 0) {
    return leaks;
  }

  // Calculate overall metrics to compute baseline duration in months
  const sortedByDate = [...eligibleTransactions]
    .map(t => ({ ...t, isoDate: normalizeDateToISO(t.date) }))
    .filter(t => Boolean(t.isoDate))
    .sort((a, b) => a.isoDate.localeCompare(b.isoDate));

  let monthSpan = 1;
  if (sortedByDate.length >= 2) {
    const firstDate = new Date(sortedByDate[0].isoDate);
    const lastDate = new Date(sortedByDate[sortedByDate.length - 1].isoDate);
    const daysDiff = Math.max(1, (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
    monthSpan = Math.max(1, Math.round((daysDiff / 30) * 10) / 10);
  }

  // 1. Detection Pattern: Recurring Subscriptions & Micro-leaks
  const subscriptionTxs: Transaction[] = [];
  eligibleTransactions.forEach(tx => {
    const descLower = (tx.description || '').toLowerCase();
    const isSub = SUBSCRIPTION_KEYWORDS.some(keyword => descLower.includes(keyword));
    if (isSub) {
      subscriptionTxs.push(tx);
    }
  });

  if (subscriptionTxs.length > 0) {
    const totalSubAmount = subscriptionTxs.reduce((sum, tx) => sum + tx.amount, 0);
    const monthlyRate = Math.round(totalSubAmount / monthSpan);
    const uniqueVendors = Array.from(new Set(subscriptionTxs.map(tx => tx.description.trim())));

    leaks.push({
      id: 'leak-subscriptions',
      type: 'recurring_subscription',
      title: 'Recurring Digital & Lifestyle Subscriptions',
      category: 'Entertainment',
      monthlyAmount: monthlyRate,
      totalFlaggedAmount: Math.round(totalSubAmount),
      confidence: 0.95,
      detectionReason: `Identified ${subscriptionTxs.length} recurring subscription charges across ${uniqueVendors.length} services (${uniqueVendors.slice(0, 3).join(', ')}${uniqueVendors.length > 3 ? '...' : ''}). Subscriptions frequently run unattended and can be consolidated.`,
      transactionIds: subscriptionTxs.map(tx => tx.id),
      transactions: subscriptionTxs,
      isRecurring: true,
      frequencyDescription: `${subscriptionTxs.length} charges over the analyzed period`
    });
  }

  // 2. Detection Pattern: High Discretionary Dining & Food Delivery Spikes
  const foodTxs = eligibleTransactions.filter(tx => tx.category === 'Food');
  const deliveryOrDiningTxs = foodTxs.filter(tx => {
    const desc = tx.description.toLowerCase();
    return desc.includes('swiggy') || desc.includes('zomato') || desc.includes('eats') ||
           desc.includes('restaurant') || desc.includes('cafe') || desc.includes('starbucks') ||
           desc.includes('mcdonald') || desc.includes('burger') || desc.includes('pizza') ||
           desc.includes('dining');
  });

  // Flag if frequent food delivery/dining spending exists
  const targetFoodTxs = deliveryOrDiningTxs.length >= 2 ? deliveryOrDiningTxs : (foodTxs.length >= 3 ? foodTxs : []);
  if (targetFoodTxs.length >= 2) {
    const totalFoodAmount = targetFoodTxs.reduce((sum, tx) => sum + tx.amount, 0);
    const monthlyRate = Math.round(totalFoodAmount / monthSpan);

    // Only flag if spending rate is substantial (> ₹2,000/mo)
    if (monthlyRate >= 2000) {
      leaks.push({
        id: 'leak-food-delivery',
        type: 'discretionary_spike',
        title: 'High-Frequency Dining & Food Deliveries',
        category: 'Food',
        monthlyAmount: monthlyRate,
        totalFlaggedAmount: Math.round(totalFoodAmount),
        confidence: 0.88,
        detectionReason: `Logged ${targetFoodTxs.length} dining and delivery transactions totaling ₹${Math.round(totalFoodAmount).toLocaleString('en-IN')}. Discretionary food orders carry marked markups, delivery charges, and packaging fees compared to meal planning.`,
        transactionIds: targetFoodTxs.map(tx => tx.id),
        transactions: targetFoodTxs,
        isRecurring: true,
        frequencyDescription: `~${Math.round(targetFoodTxs.length / monthSpan)} orders per month`
      });
    }
  }

  // 3. Detection Pattern: Verifiable Duplicate Charges (Same Merchant & Exact Amount within 48h)
  const duplicateTxs: Transaction[] = [];
  for (let i = 0; i < eligibleTransactions.length; i++) {
    for (let j = i + 1; j < eligibleTransactions.length; j++) {
      const tx1 = eligibleTransactions[i];
      const tx2 = eligibleTransactions[j];

      if (tx1.amount === tx2.amount && tx1.amount > 100) {
        const desc1 = tx1.description.toLowerCase().trim();
        const desc2 = tx2.description.toLowerCase().trim();

        if (desc1 === desc2 || (desc1.includes(desc2) || desc2.includes(desc1))) {
          const d1 = new Date(normalizeDateToISO(tx1.date));
          const d2 = new Date(normalizeDateToISO(tx2.date));
          const hoursDiff = Math.abs((d1.getTime() - d2.getTime()) / (1000 * 60 * 60));

          if (hoursDiff <= 48) {
            if (!duplicateTxs.some(t => t.id === tx1.id)) duplicateTxs.push(tx1);
            if (!duplicateTxs.some(t => t.id === tx2.id)) duplicateTxs.push(tx2);
          }
        }
      }
    }
  }

  if (duplicateTxs.length >= 2) {
    // Avoidable amount is the excess charges beyond the 1st charge
    const avoidableDupAmount = duplicateTxs.reduce((sum, tx) => sum + tx.amount, 0) / 2;
    leaks.push({
      id: 'leak-duplicate-charges',
      type: 'duplicate_charge',
      title: 'Potential Duplicate Charges',
      category: 'Miscellaneous',
      monthlyAmount: Math.round(avoidableDupAmount / monthSpan),
      totalFlaggedAmount: Math.round(avoidableDupAmount),
      confidence: 0.90,
      detectionReason: `Detected ${duplicateTxs.length} identical swipes with exact amount and merchant name within 48 hours. These can represent POS double-swipes or accidental double-billing.`,
      transactionIds: duplicateTxs.map(tx => tx.id),
      transactions: duplicateTxs,
      isRecurring: false,
      frequencyDescription: 'Immediate dispute opportunity'
    });
  }

  // 4. Detection Pattern: Avoidable Banking & Penalty Fees
  const feeTxs = eligibleTransactions.filter(tx => {
    const desc = tx.description.toLowerCase();
    return FEE_KEYWORDS.some(kw => desc.includes(kw));
  });

  if (feeTxs.length > 0) {
    const totalFeeAmount = feeTxs.reduce((sum, tx) => sum + tx.amount, 0);
    leaks.push({
      id: 'leak-avoidable-fees',
      type: 'avoidable_fee',
      title: 'Avoidable Banking & Late Penalty Fees',
      category: 'Utilities',
      monthlyAmount: Math.round(totalFeeAmount / monthSpan),
      totalFlaggedAmount: Math.round(totalFeeAmount),
      confidence: 0.95,
      detectionReason: `Found ${feeTxs.length} penalty or bank surcharge transaction(s) totaling ₹${Math.round(totalFeeAmount).toLocaleString('en-IN')}. Setting auto-pay reminders or using network ATMs eliminates these charges completely.`,
      transactionIds: feeTxs.map(tx => tx.id),
      transactions: feeTxs,
      isRecurring: false,
      frequencyDescription: `${feeTxs.length} penalty incident(s)`
    });
  }

  // 5. Detection Pattern: Discretionary Impulse Retail / Shopping Surges
  const shoppingTxs = eligibleTransactions.filter(tx => tx.category === 'Shopping');
  if (shoppingTxs.length >= 3) {
    const totalShopping = shoppingTxs.reduce((sum, tx) => sum + tx.amount, 0);
    const monthlyShopping = Math.round(totalShopping / monthSpan);

    if (monthlyShopping >= 4000) {
      leaks.push({
        id: 'leak-shopping-impulse',
        type: 'impulse_surge',
        title: 'Non-Essential Shopping & Online Retail',
        category: 'Shopping',
        monthlyAmount: monthlyShopping,
        totalFlaggedAmount: Math.round(totalShopping),
        confidence: 0.82,
        detectionReason: `Recorded ${shoppingTxs.length} shopping transactions averaging ₹${monthlyShopping.toLocaleString('en-IN')}/month. Applying a 48-hour cooling-off rule on cart checkout helps curb non-essential impulse buying.`,
        transactionIds: shoppingTxs.map(tx => tx.id),
        transactions: shoppingTxs,
        isRecurring: true,
        frequencyDescription: `${shoppingTxs.length} purchases across analyzed period`
      });
    }
  }

  return leaks;
}
