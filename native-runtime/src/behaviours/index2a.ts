import type { Behaviour } from "../render/behaviours";
import { AUTH_BEHAVIOURS } from "./auth";
import { FORM_BEHAVIOURS } from "./forms";
import { LIST_BEHAVIOURS } from "./lists";

/**
 * Phase 2A behaviours: visitor sign-in (auth.tsx), forms and flows
 * (forms.tsx, fields.tsx), bound data (lists.tsx). Entries here replace the
 * registry's phase-1 stubs for the same attributes.
 */
export const BEHAVIOURS_2A: Behaviour[] = [...AUTH_BEHAVIOURS, ...FORM_BEHAVIOURS, ...LIST_BEHAVIOURS];
