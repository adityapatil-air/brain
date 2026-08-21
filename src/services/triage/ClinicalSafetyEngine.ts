/**
 * Client-side entry point for the deterministic clinical safety engine.
 *
 * The rules themselves live in `shared/safetyEngine.ts` so that the API proxy
 * runs the exact same logic when it builds its fallback assessment — there is
 * only ever one set of rules.
 */

export {
  runSafetyEngine,
  reconcileTriage,
  type SafetyFinding,
  type SafetyInput,
  type SafetyResult,
} from '../../../shared/safetyEngine'

export { SYMPTOM_BY_KEY, VITAL_SPECS, VITAL_SPEC_BY_KEY } from '../../../shared/clinical'
