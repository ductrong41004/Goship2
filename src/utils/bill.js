// Parse 3-digit or 5-digit employee input
// e.g. prefix "40" + input "125" -> { is5Digit: false, prefix: "40", lastDigits: "125", fullBill: "40125" }
// e.g. prefix "40" + input "41002" -> { is5Digit: true, prefix: "41", lastDigits: "002", fullBill: "41002" }
export function parseBillInput(activePrefix, rawInput) {
  const digits = String(rawInput || '').replace(/\D/g, '')
  if (digits.length === 3) {
    const lastDigitsPadded = digits.padStart(3, '0')
    return {
      is5Digit: false,
      prefix: activePrefix,
      lastDigitsPadded,
      fullBill: `${activePrefix}${lastDigitsPadded}`,
      numVal: Number(lastDigitsPadded),
    }
  }
  if (digits.length === 5) {
    const prefix = digits.slice(0, 2)
    const lastDigitsPadded = digits.slice(2)
    return {
      is5Digit: true,
      prefix,
      lastDigitsPadded,
      fullBill: digits,
      numVal: Number(lastDigitsPadded),
    }
  }
  return null
}

export function combineBill(prefix, lastDigitsRaw) {
  const parsed = parseBillInput(prefix, lastDigitsRaw)
  return parsed ? parsed.fullBill : null
}

export function isValidLastDigits(raw) {
  const digits = String(raw || '').replace(/\D/g, '')
  return digits.length === 3 || digits.length === 5
}
