/**
 * Order Utilities for BRYBOS Restaurant
 * Generates and validates unique customer-facing order IDs in the format: Brybos-XXXXXX
 */

/**
 * Generates a customer-facing order ID in the format: Brybos-XXXXXX
 * Uses 6 uppercase alphanumeric characters (excluding ambiguous characters 0, O, 1, I)
 */
export function generateBrybosOrderId(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let randomPart = '';
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    randomPart += chars.charAt(randomIndex);
  }
  return `Brybos-${randomPart}`;
}

/**
 * Validates if a string matches the Brybos order ID format: Brybos-XXXXXX
 */
export function isBrybosOrderId(orderId: string): boolean {
  return /^Brybos-[2-9A-HJ-NP-Z0-9]{6}$/i.test(orderId);
}

/**
 * Formats order number for display, ensuring Brybos prefix
 */
export function formatOrderNumber(orderNumber: string): string {
  if (!orderNumber) return 'Brybos-000000';
  if (orderNumber.startsWith('Brybos-')) return orderNumber;
  if (orderNumber.startsWith('#')) return `Brybos-${orderNumber.slice(1).padStart(6, '0')}`;
  return `Brybos-${orderNumber.slice(-6).toUpperCase()}`;
}

/**
 * Validates if a string is a standard UUID v4
 */
export function isUuid(id: string | number | undefined | null): boolean {
  if (typeof id !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}
