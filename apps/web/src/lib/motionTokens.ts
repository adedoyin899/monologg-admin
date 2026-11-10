/**
 * JS-side mirror of the motion tokens in src/styles/tokens.css.
 * Framer Motion's `transition` prop takes plain numbers/arrays, not CSS
 * custom properties, so these can't be read from the stylesheet at
 * runtime — this file is the single place both sides derive from.
 * Keep these numerically in sync with the duration/ease tokens in tokens.css.
 */
export const DURATION_FAST = 0.16; // --duration-fast: 160ms
export const DURATION_MED = 0.28; // --duration-med: 280ms
export const DURATION_SLOW = 0.4; // --duration-slow: 400ms

export const EASE_OUT = [0.22, 1, 0.36, 1] as const; // --ease-out
export const EASE_SPRING = [0.34, 1.4, 0.64, 1] as const; // --ease-spring
