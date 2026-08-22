/**
 * ASHA Care API proxy.
 *
 * Every third-party call that requires a private key happens here, never in the
 * browser: Whisper (OpenAI), Gemini and Google Places. The browser only ever
 * talks to Supabase (with the public anon key, protected by RLS) and to /api.
 */

import express from 'express'
import cors from 'cors'
import multer from 'multer'
import { z } from 'zod'

import { capabilities, env } from './env.js'
import { transcribe } from './services/whisper.js'
import { assess, extractSymptoms } from './services/gemini.js'
import { searchByText, searchNearby } from './services/places.js'

const app = express()
app.use(cors())
app.use(express.json({ limit: '1mb' }))

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // Whisper's hard limit
})

const languageSchema = z.enum(['en', 'hi', 'mr'])

const vitalsSchema = z
  .object({
    temperature: z.number().nullable().optional(),
    pulse: z.number().nullable().optional(),
    respiratory_rate: z.number().nullable().optional(),
    spo2: z.number().nullable().optional(),
    systolic_bp: z.number().nullable().optional(),
    diastolic_bp: z.number().nullable().optional(),
    weight: z.number().nullable().optional(),
    blood_glucose: z.number().nullable().optional(),
  })
  .default({})

const patientSchema = z.object({
  full_name: z.string().min(1),
  age: z.number().min(0).max(130),
  gender: z.string().min(1),
  pregnancy_status: z.string().nullable().optional(),
  health_category: z.string().nullable().optional(),
  existing_conditions: z.array(z.string()).nullable().optional(),
  allergies: z.array(z.string()).nullable().optional(),
})

// ---------------------------------------------------------------------------

app.get('/', (_req, res) => {
  res.json({
    ok: true,
    message: 'ASHA Care API is running',
    health: '/api/health',
  })
})

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, capabilities: capabilities() })
})

// ------------------------------------------------------------------ Whisper
app.post('/api/voice/transcribe', upload.single('audio'), async (req, res) => {
  const parsedLang = languageSchema.safeParse(req.body?.language)
  const language = parsedLang.success ? parsedLang.data : 'en'

  try {
    if (!req.file && env.whisper.apiKey) {
      return res.status(400).json({ error: 'NO_AUDIO', message: 'No audio file was received.' })
    }
    const buffer = req.file?.buffer ?? Buffer.alloc(0)
    const result = await transcribe(buffer, req.file?.mimetype ?? 'audio/webm', language)
    res.json(result)
  } catch (err) {
    console.error('[transcribe]', err)
    res.status(502).json({
      error: 'TRANSCRIPTION_FAILED',
      message: 'Voice transcription failed.',
      detail: process.env.NODE_ENV === 'production' ? undefined : String(err),
    })
  }
})

// ----------------------------------------------------- Gemini: extraction
const extractSchema = z.object({
  transcript: z.string().min(1),
  language: languageSchema.default('en'),
  patient: patientSchema,
  existingSymptoms: z.array(z.string()).default([]),
  vitals: vitalsSchema,
})

app.post('/api/ai/extract', async (req, res) => {
  const parsed = extractSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'BAD_REQUEST', message: parsed.error.issues[0]?.message })
  }
  try {
    res.json(await extractSymptoms(parsed.data))
  } catch (err) {
    console.error('[extract]', err)
    res.status(502).json({
      error: 'EXTRACTION_FAILED',
      message: 'Symptom extraction is temporarily unavailable.',
      detail: process.env.NODE_ENV === 'production' ? undefined : String(err),
    })
  }
})

// ---------------------------------------------------- Gemini: assessment
const assessSchema = z.object({
  patient: patientSchema,
  visit: z.object({
    visit_type: z.string().default('home_visit'),
    visit_date: z.string(),
    language: languageSchema.default('en'),
  }),
  symptoms: z
    .array(
      z.object({
        symptom_name: z.string(),
        severity: z.string().nullable().optional(),
        duration: z.string().nullable().optional(),
      }),
    )
    .default([]),
  vitals: vitalsSchema,
  transcript: z.string().nullable().optional(),
})

app.post('/api/ai/assess', async (req, res) => {
  const parsed = assessSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'BAD_REQUEST', message: parsed.error.issues[0]?.message })
  }
  try {
    res.json(await assess(parsed.data))
  } catch (err) {
    console.error('[assess]', err)
    res.status(502).json({
      error: 'ASSESSMENT_FAILED',
      message: 'Clinical AI is temporarily unavailable.',
      detail: process.env.NODE_ENV === 'production' ? undefined : String(err),
    })
  }
})

// ------------------------------------------------------------ Google Places
const nearbySchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  radiusMeters: z.number().min(500).max(50000).default(15000),
  urgent: z.boolean().default(false),
})

app.post('/api/places/nearby', async (req, res) => {
  const parsed = nearbySchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'BAD_REQUEST', message: parsed.error.issues[0]?.message })
  }
  try {
    res.json(await searchNearby(parsed.data))
  } catch (err) {
    console.error('[places/nearby]', err)
    res.status(502).json({ error: 'PLACES_FAILED', message: 'Nearby facilities could not be loaded.' })
  }
})

const textSchema = z.object({
  query: z.string().min(2).max(120),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
})

app.post('/api/places/search', async (req, res) => {
  const parsed = textSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'BAD_REQUEST', message: parsed.error.issues[0]?.message })
  }
  try {
    res.json(await searchByText(parsed.data))
  } catch (err) {
    console.error('[places/search]', err)
    res.status(502).json({ error: 'PLACES_FAILED', message: 'Facility search could not be completed.' })
  }
})

// ---------------------------------------------------------------------------

app.use((req, res) => {
  res.status(404).json({ error: 'NOT_FOUND', message: `No API route for ${req.method} ${req.path}` })
})

app.listen(env.port, () => {
  const caps = capabilities()
  console.log(`\n  ASHA Care API  →  http://localhost:${env.port}`)
  console.log(
    `  Whisper (speech-to-text) : ${
      caps.whisper ? `configured (${caps.whisperModel} @ ${env.whisper.baseUrl})` : 'NOT configured — simulated transcripts'
    }`,
  )
  console.log(`  Gemini  (clinical AI)    : ${caps.gemini ? `configured (${caps.geminiModel})` : 'NOT configured — deterministic rule engine only'}`)
  console.log(`  Google Places (facility) : ${caps.places ? 'configured' : 'NOT configured — seeded facility directory only'}\n`)
})
