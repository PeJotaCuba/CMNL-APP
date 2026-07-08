const pct = (num, denom) => {
  if (!denom) return '0';
  return `${Math.round((num / denom) * 100)}`;
};
console.log("pct(0, 100):", pct(0, 100));
console.log("pct(undefined, 100):", pct(undefined, 100));
console.log("pct(NaN, 100):", pct(NaN, 100));
console.log("pct(null, 100):", pct(null, 100));
console.log("pct('', 100):", pct('', 100));
