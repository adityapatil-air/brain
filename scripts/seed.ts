/**
 * Seeds a real Supabase project with demo accounts and clinical history.
 *
 *   1. Run `supabase/migrations/0001_init.sql` in the Supabase SQL editor.
 *   2. Put SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in `.env`.
 *   3. `npm run seed`
 *
 * Idempotent: re-running updates existing rows instead of duplicating them.
 * The service-role key bypasses RLS and must never reach the browser.
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import {
  SEED_FACILITIES,
  SEED_MEMBERS,
  SEED_PROFILES,
  SEED_VISITS,
} from '../shared/demoData.js'

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error(
    '\n  Missing credentials.\n' +
      '  Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env, then re-run `npm run seed`.\n' +
      '  (Project settings → API → service_role secret)\n',
  )
  process.exit(1)
}

const db = createClient(url, serviceKey, { auth: { persistSession: false } })

const ashaPassword = process.env.SEED_ASHA_PASSWORD ?? '123456'
const phcPassword = process.env.SEED_PHC_PASSWORD ?? '123456'

const log = (msg: string) => console.log(`  ${msg}`)

function fail(label: string, error: unknown): never {
  console.error(`\n  ✗ ${label}`)
  console.error(error)
  process.exit(1)
}

async function upsertAuthUser(email: string, password: string): Promise<string> {
  // Try to find the user first (admin.listUsers is paginated).
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 })
    if (error) fail(`listing auth users`, error)
    const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
    if (found) {
      const { error: updErr } = await db.auth.admin.updateUserById(found.id, {
        password,
        email_confirm: true,
      })
      if (updErr) fail(`updating password for ${email}`, updErr)
      return found.id
    }
    if (data.users.length < 200) break
  }

  const { data, error } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (error || !data.user) fail(`creating auth user ${email}`, error)
  return data.user.id
}

async function main() {
  console.log('\n  ASHA Care — seeding Supabase\n')

  // ------------------------------------------------------------- profiles
  const profileIds = new Map<string, string>()
  for (const p of SEED_PROFILES) {
    const password = p.role === 'asha' ? ashaPassword : phcPassword
    const authUserId = await upsertAuthUser(p.email, password)

    const { data, error } = await db
      .from('profiles')
      .upsert(
        {
          auth_user_id: authUserId,
          full_name: p.full_name,
          role: p.role,
          asha_code: p.asha_code,
          phone: p.phone,
          village: p.village,
          district: p.district,
          state: p.state,
        },
        { onConflict: 'auth_user_id' },
      )
      .select('id')
      .single()
    if (error || !data) fail(`upserting profile ${p.full_name}`, error)

    profileIds.set(p.key, data.id)
    log(`✓ ${p.role.padEnd(10)} ${p.asha_code ?? '—'}  ${p.email}  (password: ${password})`)
  }

  // ----------------------------------------------------------- facilities
  const { data: facRows, error: facErr } = await db
    .from('healthcare_facilities')
    .upsert(SEED_FACILITIES, { onConflict: 'name,latitude,longitude' })
    .select('id,name')
  if (facErr) fail('upserting facilities', facErr)
  const facilityIds = new Map((facRows ?? []).map((f) => [f.name, f.id]))
  log(`✓ ${facRows?.length ?? 0} healthcare facilities`)

  // -------------------------------------------------------------- members
  const memberRows = SEED_MEMBERS.map((m) => ({
    member_code: m.member_code,
    full_name: m.full_name,
    age: m.age,
    gender: m.gender,
    phone: m.phone,
    village: m.village,
    address: m.address,
    pregnancy_status: m.pregnancy_status,
    health_category: m.health_category,
    existing_conditions: m.existing_conditions,
    allergies: m.allergies,
    high_risk: m.high_risk,
    asha_id: profileIds.get(m.asha)!,
    latitude: m.latitude,
    longitude: m.longitude,
  }))
  const { data: memRows, error: memErr } = await db
    .from('members')
    .upsert(memberRows, { onConflict: 'member_code' })
    .select('id,member_code')
  if (memErr) fail('upserting members', memErr)
  const memberIds = new Map((memRows ?? []).map((m) => [m.member_code, m.id]))
  log(`✓ ${memRows?.length ?? 0} members`)

  // --------------------------------------------------------------- visits
  // Remove any previously-seeded visits so re-running stays clean.
  const { data: existing } = await db
    .from('visits')
    .select('id')
    .in('asha_id', [...profileIds.values()])
  if (existing?.length) {
    await db.from('visits').delete().in('id', existing.map((v) => v.id))
    log(`· cleared ${existing.length} previously seeded visits`)
  }

  let referralCount = 0
  for (const v of SEED_VISITS) {
    const memberId = memberIds.get(v.member_code)
    const ashaId = profileIds.get(v.asha)
    if (!memberId || !ashaId) continue

    const date = new Date()
    date.setDate(date.getDate() - v.daysAgo)
    date.setHours(v.hour, 15, 0, 0)

    const { data: visit, error: visitErr } = await db
      .from('visits')
      .insert({
        member_id: memberId,
        asha_id: ashaId,
        visit_date: date.toISOString(),
        visit_type: v.visit_type,
        status: 'completed',
        transcript: v.transcript,
        language: v.language,
        clinical_summary: v.summary,
        triage_level: v.triage,
        triage_reason: v.reasoning.join(' · '),
        recommended_action: v.recommended_action,
        referral_required: Boolean(v.referral),
        referral_urgency: v.referral?.urgency ?? null,
      })
      .select('id')
      .single()
    if (visitErr || !visit) fail(`inserting visit for ${v.member_code}`, visitErr)

    if (v.symptoms.length) {
      const { error } = await db.from('symptoms').insert(
        v.symptoms.map((s) => ({
          visit_id: visit.id,
          symptom_name: s.name,
          category: s.category,
          severity: s.severity,
          duration: s.duration,
          source: s.source,
        })),
      )
      if (error) fail(`inserting symptoms for ${v.member_code}`, error)
    }

    const { error: vitalErr } = await db.from('vitals').insert({
      visit_id: visit.id,
      ...v.vitals,
      recorded_at: date.toISOString(),
    })
    if (vitalErr) fail(`inserting vitals for ${v.member_code}`, vitalErr)

    const { error: assessErr } = await db.from('assessments').insert({
      visit_id: visit.id,
      ai_summary: v.summary,
      reasoning: v.reasoning,
      safety_findings: [],
      risk: v.triage,
      ai_risk: v.triage,
      safety_override: false,
      recommended_action: v.recommended_action,
      confidence: 0.86,
      model_name: 'seed-data',
    })
    if (assessErr) fail(`inserting assessment for ${v.member_code}`, assessErr)

    if (v.referral) {
      const facility = SEED_FACILITIES.find((f) => f.name === v.referral!.facility_name)
      const member = SEED_MEMBERS.find((m) => m.member_code === v.member_code)!
      const distance =
        facility
          ? Number(
              (
                6371 *
                2 *
                Math.asin(
                  Math.sqrt(
                    Math.sin((((facility.latitude - member.latitude) * Math.PI) / 180) / 2) ** 2 +
                      Math.cos((member.latitude * Math.PI) / 180) *
                        Math.cos((facility.latitude * Math.PI) / 180) *
                        Math.sin((((facility.longitude - member.longitude) * Math.PI) / 180) / 2) ** 2,
                  ),
                )
              ).toFixed(2),
            )
          : null

      const { error } = await db.from('referrals').insert({
        visit_id: visit.id,
        member_id: memberId,
        asha_id: ashaId,
        triage_level: v.triage,
        urgency: v.referral.urgency,
        reason: v.referral.reason,
        referral_note: v.referral.note,
        facility_id: facility ? facilityIds.get(facility.name) ?? null : null,
        facility_name: facility?.name ?? null,
        facility_address: facility?.address ?? null,
        facility_latitude: facility?.latitude ?? null,
        facility_longitude: facility?.longitude ?? null,
        facility_distance: distance,
        status: v.referral.status,
        acknowledged_at:
          v.referral.status === 'pending' ? null : new Date(date.getTime() + 40 * 60_000).toISOString(),
        reviewed_at:
          v.referral.status === 'reviewed' || v.referral.status === 'completed'
            ? new Date(date.getTime() + 90 * 60_000).toISOString()
            : null,
      })
      if (error) fail(`inserting referral for ${v.member_code}`, error)
      referralCount++
    }

    await db.from('visit_events').insert({
      visit_id: visit.id,
      actor_id: ashaId,
      event_type: 'visit_completed',
      payload: { triage: v.triage, seeded: true },
    })
  }

  log(`✓ ${SEED_VISITS.length} visits with symptoms, vitals and assessments`)
  log(`✓ ${referralCount} referrals`)

  console.log('\n  Done. Sign in with:')
  console.log(`    ASHA  →  ASHA001 / ${ashaPassword}`)
  console.log(`    PHC   →  PHC001  / ${phcPassword}\n`)
}

main().catch((err) => fail('seeding', err))
