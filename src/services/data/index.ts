import { isSupabaseConfigured } from '../supabase/client'
import { DemoRepository } from './demoRepository'
import { SupabaseRepository } from './supabaseRepository'
import type { Repository } from './types'

/**
 * Single data-access entry point for the whole app.
 * Supabase is used whenever it is configured; otherwise a clearly-labelled
 * local demo backend keeps the workflow testable.
 */
export const repo: Repository = isSupabaseConfigured
  ? new SupabaseRepository()
  : new DemoRepository()

export const isDemoBackend = repo.kind === 'demo'

export * from './types'
