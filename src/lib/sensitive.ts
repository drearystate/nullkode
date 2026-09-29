/**
 * Column and field names that hold secrets: password hashes, API tokens,
 * signing secrets. One definition shared by the Data tab, exports, offline
 * copies, owner alert emails and the flow runtime, so a column that is hidden
 * in one place is hidden everywhere.
 */
export const SENSITIVE_COLUMN = /password|_hash$|secret|token/i;
