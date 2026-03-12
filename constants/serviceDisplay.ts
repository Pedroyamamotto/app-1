const NUMBER_WORDS_PT: Record<number, string> = {
  2: 'duas',
  3: 'tres',
  4: 'quatro',
  5: 'cinco',
  6: 'seis',
  7: 'sete',
  8: 'oito',
  9: 'nove',
  10: 'dez',
};

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const getFirstProductSegment = (value: unknown) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return raw.split('|')[0]?.trim() || raw;
};

export const getServiceQuantity = (value: unknown) => {
  const segment = getFirstProductSegment(value);
  const match = segment.match(/^(\d+)\s*x\s*/i);
  return match ? Number(match[1]) : 1;
};

export const extractLockName = (value: unknown) => {
  const segment = getFirstProductSegment(value);
  if (!segment) return 'Fechadura';

  const withoutAmount = segment.replace(/^\s*\d+\s*x\s*/i, '').trim();
  const lockStart = withoutAmount.search(/fechadura/i);

  if (lockStart >= 0) {
    return withoutAmount.slice(lockStart).trim();
  }

  return withoutAmount;
};

export const extractLockModelName = (value: unknown) => {
  const lockName = extractLockName(value);

  const brandMatch = lockName.match(/yamamotto\s+(.+)$/i);
  if (brandMatch?.[1]) {
    return brandMatch[1].trim();
  }

  const simplified = lockName.replace(/^fechadura(?:\s+digital)?(?:\s+sobrepor|\s+embutir)?\s+/i, '').trim();
  return simplified || lockName;
};

export const formatLockDisplayName = (value: unknown) => {
  const quantity = getServiceQuantity(value);
  if (quantity <= 1) {
    return extractLockName(value);
  }

  const quantityLabel = NUMBER_WORDS_PT[quantity] || String(quantity);
  const modelName = extractLockModelName(value);
  return `${capitalize(quantityLabel)} unidades da ${modelName}`;
};