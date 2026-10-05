/** Misma política que el backend: 7–24 caracteres, mayúscula, minúscula, número y carácter especial. */
export const PASSWORD_RULES = [
  { id: "len", label: "Entre 7 y 24 caracteres", test: (p: string) => p.length >= 7 && p.length <= 24 },
  { id: "upper", label: "Una mayúscula", test: (p: string) => /\p{Lu}/u.test(p) },
  { id: "lower", label: "Una minúscula", test: (p: string) => /\p{Ll}/u.test(p) },
  { id: "digit", label: "Un número", test: (p: string) => /\p{Nd}/u.test(p) },
  { id: "special", label: "Un carácter especial (! @ # $ %…)", test: (p: string) => /[^\p{L}\p{N}\s]/u.test(p) },
] as const;

export const isStrongPassword = (p: string) => PASSWORD_RULES.every((r) => r.test(p));
