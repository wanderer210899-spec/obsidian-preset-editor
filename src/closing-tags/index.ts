/**
 * Closing-tags module (SRS 3.9): what auto complete adds while typing, and
 * which tags pair up. Plain text in, plain positions out; no CodeMirror here.
 */
export { pairAt, type Span } from './tags';
export { type Change, onBackspace, onType, type Plan, renamePartner } from './typing';
