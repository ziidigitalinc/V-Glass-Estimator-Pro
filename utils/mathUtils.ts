
/**
 * Converts a fractional string like "27 5/8" to a decimal 27.625
 */
export const parseFraction = (value) => {
  if (!value) return 0;
  const trimmed = value.toString().trim();
  
  // Matches "27 5/8", "27-5/8", "5/8", or "27.625"
  const fractionMatch = trimmed.match(/^(\d+)?\s*[\s-]?\s*(\d+)\/(\d+)$/);
  
  if (fractionMatch) {
    const whole = parseInt(fractionMatch[1] || '0', 10);
    const num = parseInt(fractionMatch[2], 10);
    const den = parseInt(fractionMatch[3], 10);
    return whole + (num / den);
  }
  
  const decimalValue = parseFloat(trimmed);
  return isNaN(decimalValue) ? 0 : decimalValue;
};

/**
 * Calculates square footage given width/height in inches.
 * Includes a 5% waste factor (1.05 multiplier).
 */
export const calculateSqFt = (width, height) => {
  const w = parseFraction(width);
  const h = parseFraction(height);
  if (w <= 0 || h <= 0) return 0;
  // Glass industry standard: (W * H) / 144
  return ((w * h) / 144) * 1.05;
};

/**
 * Calculates linear inches based on selected mode
 */
export const calculateLinearInches = (width, height, type) => {
  const w = parseFraction(width);
  const h = parseFraction(height);
  if (w <= 0 || h <= 0) return 0;

  switch (type) {
    case 'all':
      return 2 * (w + h);
    case 'long':
      return 2 * Math.max(w, h);
    case 'short':
      return 2 * Math.min(w, h);
    default:
      return 0;
  }
};

/**
 * Formats a number as currency
 */
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

/**
 * Formats square footage to 2 decimal places
 */
export const formatSqFt = (val) => {
  return Number(val).toFixed(2);
};
