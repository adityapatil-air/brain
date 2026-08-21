import 'dotenv/config'

const read = (key: string): string | null => {
  const v = process.env[key]
  return v && v.trim().length > 0 ? v.trim() : null
}

export const env = {
  // API_PORT is checked first and deliberately: some dev harnesses inject a
  // generic PORT for the web server, which must not hijack the API proxy.
  port: Number(read('API_PORT') ?? read('PORT') ?? 8787),
  gemini: {
    apiKey: read('GEMINI_API_KEY'),
    model: read('GEMINI_MODEL') ?? 'gemini-3.7-flash',
    /** Tried in order if the primary model stays overloaded. */
    fallbackModels: (read('GEMINI_FALLBACK_MODELS') ?? 'gemini-3.6-flash,gemini-flash-latest')
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean),
  },
  whisper: {
    // Any OpenAI-compatible /audio/transcriptions endpoint works here:
    // OpenAI itself, or Groq (which serves the real whisper-large-v3 free).
    apiKey: read('OPENAI_API_KEY'),
    model: read('WHISPER_MODEL') ?? 'whisper-1',
    baseUrl: (read('WHISPER_BASE_URL') ?? 'https://api.openai.com/v1').replace(/\/+$/, ''),
  },
  maps: {
    apiKey: read('GOOGLE_MAPS_API_KEY'),
  },
}

export const capabilities = () => ({
  whisper: Boolean(env.whisper.apiKey),
  gemini: Boolean(env.gemini.apiKey),
  places: Boolean(env.maps.apiKey),
  geminiModel: env.gemini.model,
  whisperModel: env.whisper.model,
})
