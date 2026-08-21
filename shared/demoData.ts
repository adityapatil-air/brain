/**
 * Demo dataset — used by `npm run seed` (to populate a real Supabase project)
 * and by the local demo backend that runs when no Supabase project is
 * configured. Kept in one place so both paths show identical data.
 *
 * NOTE ON FACILITIES: these are real public health facilities in Pune
 * district, with approximate coordinates. They exist so the referral flow
 * still works when the Google Places API key is absent. In a real deployment
 * this table must be loaded from the official state facility register; live
 * Google Places results are always preferred and are labelled as such.
 */

export interface SeedProfile {
  key: string
  email: string
  full_name: string
  role: 'asha' | 'phc_doctor' | 'admin'
  asha_code: string | null
  phone: string
  village: string | null
  district: string
  state: string
}

export const SEED_PROFILES: SeedProfile[] = [
  {
    key: 'asha1',
    email: 'asha001@ashacare.demo',
    full_name: 'Sunita Kamble',
    role: 'asha',
    asha_code: 'ASHA001',
    phone: '+91 98220 41187',
    village: 'Wagholi',
    district: 'Pune',
    state: 'Maharashtra',
  },
  {
    key: 'asha2',
    email: 'asha002@ashacare.demo',
    full_name: 'Rekha Pawar',
    role: 'asha',
    asha_code: 'ASHA002',
    phone: '+91 98220 55214',
    village: 'Lonikand',
    district: 'Pune',
    state: 'Maharashtra',
  },
  {
    key: 'phc1',
    email: 'phc001@ashacare.demo',
    full_name: 'Dr. Anil Deshmukh',
    role: 'phc_doctor',
    asha_code: 'PHC001',
    phone: '+91 20 2705 1140',
    village: null,
    district: 'Pune',
    state: 'Maharashtra',
  },
]

export interface SeedMember {
  member_code: string
  full_name: string
  age: number
  gender: 'male' | 'female' | 'other'
  phone: string
  village: string
  address: string
  pregnancy_status: 'not_applicable' | 'pregnant' | 'postnatal' | 'lactating'
  health_category: 'general' | 'pregnant' | 'postnatal' | 'child' | 'chronic' | 'elderly'
  existing_conditions: string[]
  allergies: string[]
  high_risk: boolean
  asha: 'asha1' | 'asha2'
  latitude: number
  longitude: number
}

export const SEED_MEMBERS: SeedMember[] = [
  {
    member_code: 'WGH-0001',
    full_name: 'Sita Devi',
    age: 26,
    gender: 'female',
    phone: '+91 91580 22417',
    village: 'Wagholi',
    address: 'House 42, Kesnand Road, Wagholi',
    pregnancy_status: 'pregnant',
    health_category: 'pregnant',
    existing_conditions: ['Anaemia (Hb 9.1)'],
    allergies: [],
    high_risk: true,
    asha: 'asha1',
    latitude: 18.5793,
    longitude: 73.9803,
  },
  {
    member_code: 'WGH-0002',
    full_name: 'Kavita Jadhav',
    age: 31,
    gender: 'female',
    phone: '+91 91580 33902',
    village: 'Wagholi',
    address: 'Plot 8, Awhalwadi Road, Wagholi',
    pregnancy_status: 'postnatal',
    health_category: 'postnatal',
    existing_conditions: [],
    allergies: ['Sulfa drugs'],
    high_risk: false,
    asha: 'asha1',
    latitude: 18.5821,
    longitude: 73.9762,
  },
  {
    member_code: 'WGH-0003',
    full_name: 'Aarav Shinde',
    age: 2,
    gender: 'male',
    phone: '+91 91580 77120',
    village: 'Wagholi',
    address: 'Shinde Vasti, Wagholi',
    pregnancy_status: 'not_applicable',
    health_category: 'child',
    existing_conditions: [],
    allergies: [],
    high_risk: false,
    asha: 'asha1',
    latitude: 18.5768,
    longitude: 73.9841,
  },
  {
    member_code: 'WGH-0004',
    full_name: 'Ramesh Gaikwad',
    age: 58,
    gender: 'male',
    phone: '+91 91580 41288',
    village: 'Wagholi',
    address: 'Near Zilla Parishad School, Wagholi',
    pregnancy_status: 'not_applicable',
    health_category: 'chronic',
    existing_conditions: ['Type 2 diabetes', 'Hypertension'],
    allergies: [],
    high_risk: true,
    asha: 'asha1',
    latitude: 18.5805,
    longitude: 73.9788,
  },
  {
    member_code: 'WGH-0005',
    full_name: 'Lakshmi Bhosale',
    age: 67,
    gender: 'female',
    phone: '+91 91580 60471',
    village: 'Wagholi',
    address: 'Bhosale Chawl, Wagholi',
    pregnancy_status: 'not_applicable',
    health_category: 'elderly',
    existing_conditions: ['Osteoarthritis'],
    allergies: [],
    high_risk: false,
    asha: 'asha1',
    latitude: 18.5779,
    longitude: 73.9817,
  },
  {
    member_code: 'WGH-0006',
    full_name: 'Priya More',
    age: 23,
    gender: 'female',
    phone: '+91 91580 90233',
    village: 'Kesnand',
    address: 'Kesnand Gaothan, Wagholi',
    pregnancy_status: 'pregnant',
    health_category: 'pregnant',
    existing_conditions: [],
    allergies: [],
    high_risk: false,
    asha: 'asha1',
    latitude: 18.5934,
    longitude: 74.0121,
  },
  {
    member_code: 'WGH-0007',
    full_name: 'Ishaan Kadam',
    age: 4,
    gender: 'male',
    phone: '+91 91580 12455',
    village: 'Kesnand',
    address: 'Kadam Vasti, Kesnand',
    pregnancy_status: 'not_applicable',
    health_category: 'child',
    existing_conditions: [],
    allergies: [],
    high_risk: false,
    asha: 'asha1',
    latitude: 18.5951,
    longitude: 74.0098,
  },
  {
    member_code: 'LNK-0008',
    full_name: 'Sunanda Sawant',
    age: 44,
    gender: 'female',
    phone: '+91 91580 55671',
    village: 'Lonikand',
    address: 'Sawant Nagar, Lonikand',
    pregnancy_status: 'not_applicable',
    health_category: 'chronic',
    existing_conditions: ['Hypothyroidism'],
    allergies: ['Penicillin'],
    high_risk: false,
    asha: 'asha2',
    latitude: 18.6153,
    longitude: 73.9971,
  },
  {
    member_code: 'LNK-0009',
    full_name: 'Ganesh Chavan',
    age: 35,
    gender: 'male',
    phone: '+91 91580 33418',
    village: 'Lonikand',
    address: 'Chavan Wada, Lonikand',
    pregnancy_status: 'not_applicable',
    health_category: 'general',
    existing_conditions: [],
    allergies: [],
    high_risk: false,
    asha: 'asha2',
    latitude: 18.6121,
    longitude: 73.9944,
  },
  {
    member_code: 'LNK-0010',
    full_name: 'Meera Patil',
    age: 29,
    gender: 'female',
    phone: '+91 91580 78120',
    village: 'Lonikand',
    address: 'Patil Vasti, Lonikand',
    pregnancy_status: 'pregnant',
    health_category: 'pregnant',
    existing_conditions: ['Previous caesarean section'],
    allergies: [],
    high_risk: true,
    asha: 'asha2',
    latitude: 18.6178,
    longitude: 74.0012,
  },
  {
    member_code: 'WGH-0011',
    full_name: 'Anita Salunkhe',
    age: 38,
    gender: 'female',
    phone: '+91 91580 21344',
    village: 'Wagholi',
    address: 'Salunkhe Vasti, Wagholi',
    pregnancy_status: 'not_applicable',
    health_category: 'general',
    existing_conditions: [],
    allergies: [],
    high_risk: false,
    asha: 'asha1',
    latitude: 18.5812,
    longitude: 73.9829,
  },
  {
    member_code: 'WGH-0012',
    full_name: 'Baby Kirti Waghmare',
    age: 0.5,
    gender: 'female',
    phone: '+91 91580 66218',
    village: 'Wagholi',
    address: 'Waghmare Chawl, Wagholi',
    pregnancy_status: 'not_applicable',
    health_category: 'child',
    existing_conditions: ['Low birth weight (2.1 kg)'],
    allergies: [],
    high_risk: true,
    asha: 'asha1',
    latitude: 18.5787,
    longitude: 73.9795,
  },
]

export interface SeedFacility {
  name: string
  facility_type: 'hospital' | 'phc' | 'government_hospital' | 'emergency_facility' | 'clinic'
  address: string
  latitude: number
  longitude: number
  phone: string | null
  district: string
  state: string
  has_emergency: boolean
}

export const SEED_FACILITIES: SeedFacility[] = [
  {
    name: 'Primary Health Centre, Wagholi',
    facility_type: 'phc',
    address: 'Kesnand Road, Wagholi, Pune 412207',
    latitude: 18.5801,
    longitude: 73.9812,
    phone: '+91 20 2705 1140',
    district: 'Pune',
    state: 'Maharashtra',
    has_emergency: false,
  },
  {
    name: 'Rural Hospital, Lonikand',
    facility_type: 'government_hospital',
    address: 'Nagar Road, Lonikand, Pune 412216',
    latitude: 18.6134,
    longitude: 73.9958,
    phone: '+91 20 2699 2210',
    district: 'Pune',
    state: 'Maharashtra',
    has_emergency: true,
  },
  {
    name: 'Sub-District Hospital, Yerwada',
    facility_type: 'government_hospital',
    address: 'Yerwada, Pune 411006',
    latitude: 18.5556,
    longitude: 73.8931,
    phone: '+91 20 2668 1024',
    district: 'Pune',
    state: 'Maharashtra',
    has_emergency: true,
  },
  {
    name: 'Sassoon General Hospital',
    facility_type: 'government_hospital',
    address: 'Near Pune Railway Station, Sassoon Road, Pune 411001',
    latitude: 18.5286,
    longitude: 73.8742,
    phone: '+91 20 2612 8000',
    district: 'Pune',
    state: 'Maharashtra',
    has_emergency: true,
  },
  {
    name: 'District Hospital Aundh (Aundh Chest Hospital)',
    facility_type: 'government_hospital',
    address: 'Aundh, Pune 411027',
    latitude: 18.5601,
    longitude: 73.8077,
    phone: '+91 20 2588 1206',
    district: 'Pune',
    state: 'Maharashtra',
    has_emergency: true,
  },
  {
    name: 'Primary Health Centre, Kesnand',
    facility_type: 'phc',
    address: 'Kesnand Gaothan, Pune 412207',
    latitude: 18.5941,
    longitude: 74.0107,
    phone: null,
    district: 'Pune',
    state: 'Maharashtra',
    has_emergency: false,
  },
  {
    name: 'Community Health Centre, Kharadi',
    facility_type: 'hospital',
    address: 'Kharadi, Pune 411014',
    latitude: 18.5514,
    longitude: 73.9412,
    phone: null,
    district: 'Pune',
    state: 'Maharashtra',
    has_emergency: true,
  },
]

// ---------------------------------------------------------------------------
// Historical visits so both dashboards look populated on first login.
// `daysAgo` is resolved against the current date at seed time.
// ---------------------------------------------------------------------------

export interface SeedVisit {
  member_code: string
  asha: 'asha1' | 'asha2'
  daysAgo: number
  hour: number
  visit_type: 'home_visit' | 'follow_up' | 'antenatal' | 'postnatal' | 'child_check'
  language: 'en' | 'hi' | 'mr'
  transcript: string | null
  symptoms: Array<{ name: string; category: string; severity: 'mild' | 'moderate' | 'severe'; duration: string; source: 'manual' | 'voice' | 'ai' }>
  vitals: Record<string, number | null>
  triage: 'GREEN' | 'YELLOW' | 'RED'
  summary: string
  reasoning: string[]
  recommended_action: string
  referral?: {
    urgency: 'routine' | 'soon' | 'urgent'
    reason: string
    note: string
    facility_name: string
    status: 'pending' | 'acknowledged' | 'reviewed' | 'completed'
  }
}

export const SEED_VISITS: SeedVisit[] = [
  {
    member_code: 'WGH-0004',
    asha: 'asha1',
    daysAgo: 0,
    hour: 9,
    visit_type: 'follow_up',
    language: 'mr',
    transcript: 'मला दोन दिवसांपासून खूप चक्कर येत आहे आणि अशक्तपणा जाणवतो आहे.',
    symptoms: [
      { name: 'dizziness', category: 'general', severity: 'moderate', duration: '2 days', source: 'voice' },
      { name: 'weakness', category: 'general', severity: 'moderate', duration: '2 days', source: 'voice' },
    ],
    vitals: { temperature: 37.1, pulse: 96, respiratory_rate: 18, spo2: 97, systolic_bp: 148, diastolic_bp: 94, weight: 74, blood_glucose: 212 },
    triage: 'YELLOW',
    summary:
      'Ramesh Gaikwad, 58, known diabetic and hypertensive, reports two days of dizziness and weakness. BP 148/94 mmHg and capillary glucose 212 mg/dL are both above target.',
    reasoning: ['Raised systolic blood pressure (148 mmHg)', 'Raised diastolic blood pressure (94 mmHg)', 'Abnormal blood glucose level (212 mg/dL)', 'Weakness with dizziness — possible anaemia or dehydration'],
    recommended_action: 'Review at the PHC within 48 hours for blood-pressure and glycaemic control; advise oral fluids meanwhile.',
    referral: {
      urgency: 'soon',
      reason: 'Uncontrolled hypertension and hyperglycaemia with dizziness',
      note:
        'Ramesh Gaikwad, 58y male. Known T2DM and hypertension. Two days of dizziness and weakness. BP 148/94 mmHg, capillary glucose 212 mg/dL, pulse 96 BPM, SpO2 97%. Requesting review of antihypertensive and antidiabetic regimen.',
      facility_name: 'Primary Health Centre, Wagholi',
      status: 'pending',
    },
  },
  {
    member_code: 'WGH-0012',
    asha: 'asha1',
    daysAgo: 0,
    hour: 11,
    visit_type: 'child_check',
    language: 'hi',
    transcript: 'बच्ची को कल से बुखार है और वह दूध ठीक से नहीं पी रही है।',
    symptoms: [
      { name: 'fever', category: 'general', severity: 'severe', duration: '1 day', source: 'voice' },
      { name: 'unable_to_drink', category: 'child', severity: 'severe', duration: '1 day', source: 'ai' },
      { name: 'lethargy', category: 'child', severity: 'moderate', duration: '1 day', source: 'ai' },
    ],
    vitals: { temperature: 38.9, pulse: 148, respiratory_rate: 54, spo2: 94, systolic_bp: null, diastolic_bp: null, weight: 5.4, blood_glucose: null },
    triage: 'RED',
    summary:
      'Six-month-old infant with low birth weight, febrile for one day, refusing feeds and unusually drowsy. Respiratory rate 54/min with SpO2 94%.',
    reasoning: [
      'Child unable to drink or feed — IMNCI danger sign',
      'Lethargic or unusually drowsy child — IMNCI danger sign',
      'Fast breathing for age (infant, 60/min or more)',
      'High fever (38.9 °C)',
    ],
    recommended_action: 'Arrange immediate transport to the nearest facility with paediatric care and inform the PHC doctor now.',
    referral: {
      urgency: 'urgent',
      reason: 'IMNCI danger signs in a 6-month-old — unable to feed, lethargy, fast breathing',
      note:
        'Baby Kirti Waghmare, 6 months, female, birth weight 2.1 kg. One day of fever, refusing feeds, unusually drowsy. Temperature 38.9 °C, respiratory rate 54/min, pulse 148 BPM, SpO2 94%, weight 5.4 kg. Two IMNCI danger signs present. Referred urgently for paediatric assessment and possible admission.',
      facility_name: 'Sub-District Hospital, Yerwada',
      status: 'pending',
    },
  },
  {
    member_code: 'WGH-0002',
    asha: 'asha1',
    daysAgo: 0,
    hour: 13,
    visit_type: 'postnatal',
    language: 'mr',
    transcript: 'सर्व ठीक आहे, थोडा थकवा जाणवतो पण बाळ चांगले दूध पीत आहे.',
    symptoms: [{ name: 'fatigue', category: 'general', severity: 'mild', duration: '3 days', source: 'voice' }],
    vitals: { temperature: 36.8, pulse: 82, respiratory_rate: 16, spo2: 98, systolic_bp: 116, diastolic_bp: 76, weight: 54, blood_glucose: null },
    triage: 'GREEN',
    summary: 'Day-12 postnatal check. Mild fatigue only. All vitals within normal range and the baby is feeding well.',
    reasoning: ['No danger signs matched by the deterministic rule engine.'],
    recommended_action: 'Advise iron and folic acid, adequate rest and fluids; next postnatal visit as scheduled.',
  },
  {
    member_code: 'WGH-0003',
    asha: 'asha1',
    daysAgo: 1,
    hour: 10,
    visit_type: 'child_check',
    language: 'hi',
    transcript: 'बच्चे को दो दिन से दस्त हो रहे हैं और एक बार उल्टी भी हुई।',
    symptoms: [
      { name: 'diarrhea', category: 'gastrointestinal', severity: 'moderate', duration: '2 days', source: 'voice' },
      { name: 'vomiting', category: 'gastrointestinal', severity: 'mild', duration: '1 day', source: 'voice' },
    ],
    vitals: { temperature: 37.6, pulse: 118, respiratory_rate: 28, spo2: 97, systolic_bp: null, diastolic_bp: null, weight: 11.2, blood_glucose: null },
    triage: 'YELLOW',
    summary: 'Two-year-old with two days of diarrhoea and one episode of vomiting. Alert, drinking, no dehydration signs. No IMNCI danger sign.',
    reasoning: ['Diarrhoea with vomiting in a young child'],
    recommended_action: 'Start ORS and zinc, counsel on danger signs, and review in 24 hours or sooner if the child stops drinking.',
  },
  {
    member_code: 'WGH-0001',
    asha: 'asha1',
    daysAgo: 3,
    hour: 11,
    visit_type: 'antenatal',
    language: 'hi',
    transcript: 'थोड़ी कमजोरी है, बाकी सब ठीक है। पैरों में हल्की सूजन है।',
    symptoms: [
      { name: 'weakness', category: 'general', severity: 'mild', duration: '4 days', source: 'voice' },
      { name: 'swelling', category: 'maternal', severity: 'mild', duration: '1 week', source: 'manual' },
    ],
    vitals: { temperature: 36.9, pulse: 92, respiratory_rate: 18, spo2: 98, systolic_bp: 124, diastolic_bp: 80, weight: 52, blood_glucose: null },
    triage: 'YELLOW',
    summary:
      'Sita Devi, 26, at 32 weeks with known anaemia (Hb 9.1). Mild weakness and pedal oedema. Blood pressure normal at 124/80 mmHg.',
    reasoning: ['Known anaemia with reported weakness', 'Pedal oedema in pregnancy — monitor blood pressure'],
    recommended_action: 'Continue iron and folic acid, monitor blood pressure weekly, and attend the next antenatal check at the PHC.',
  },
  {
    member_code: 'LNK-0010',
    asha: 'asha2',
    daysAgo: 2,
    hour: 15,
    visit_type: 'antenatal',
    language: 'mr',
    transcript: 'खूप तीव्र डोकेदुखी आहे आणि अंधुक दिसत आहे. पायांना सूज आहे.',
    symptoms: [
      { name: 'severe_headache', category: 'maternal', severity: 'severe', duration: '1 day', source: 'voice' },
      { name: 'blurred_vision', category: 'maternal', severity: 'moderate', duration: '1 day', source: 'voice' },
      { name: 'swelling', category: 'maternal', severity: 'moderate', duration: '4 days', source: 'manual' },
    ],
    vitals: { temperature: 37.0, pulse: 98, respiratory_rate: 20, spo2: 98, systolic_bp: 164, diastolic_bp: 112, weight: 61, blood_glucose: null },
    triage: 'RED',
    summary:
      'Meera Patil, 29, primigravida with previous caesarean, at 34 weeks. Severe headache, blurred vision and pedal oedema with BP 164/112 mmHg — features of severe pre-eclampsia.',
    reasoning: [
      'Severe hypertension — systolic BP at or above 160 mmHg (164 mmHg)',
      'Severe hypertension — diastolic BP at or above 110 mmHg (112 mmHg)',
      'Raised blood pressure with severe headache or blurred vision — possible pre-eclampsia',
      'Severe headache or blurred vision in pregnancy',
    ],
    recommended_action: 'Arrange immediate transport to a facility with obstetric and emergency care; do not delay for further tests.',
    referral: {
      urgency: 'urgent',
      reason: 'Suspected severe pre-eclampsia at 34 weeks — BP 164/112 mmHg with neurological symptoms',
      note:
        'Meera Patil, 29y female, 34 weeks gestation, previous LSCS. One day of severe headache and blurred vision, four days of pedal oedema. BP 164/112 mmHg, pulse 98 BPM, SpO2 98%, temperature 37.0 °C. Features consistent with severe pre-eclampsia. Referred urgently for obstetric evaluation and magnesium sulphate consideration.',
      facility_name: 'Sassoon General Hospital',
      status: 'acknowledged',
    },
  },
  {
    member_code: 'LNK-0008',
    asha: 'asha2',
    daysAgo: 4,
    hour: 12,
    visit_type: 'follow_up',
    language: 'en',
    transcript: 'She says she feels tired most days but is taking her thyroid tablet regularly.',
    symptoms: [{ name: 'fatigue', category: 'general', severity: 'mild', duration: '2 weeks', source: 'voice' }],
    vitals: { temperature: 36.7, pulse: 74, respiratory_rate: 16, spo2: 98, systolic_bp: 122, diastolic_bp: 78, weight: 63, blood_glucose: 104 },
    triage: 'GREEN',
    summary: 'Stable hypothyroidism on treatment. Mild fatigue, all vitals normal.',
    reasoning: ['No danger signs matched by the deterministic rule engine.'],
    recommended_action: 'Continue current medication; repeat thyroid function test at the next PHC visit.',
  },
  {
    member_code: 'WGH-0005',
    asha: 'asha1',
    daysAgo: 5,
    hour: 16,
    visit_type: 'home_visit',
    language: 'mr',
    transcript: 'गुडघे खूप दुखतात, चालायला त्रास होतो.',
    symptoms: [{ name: 'body_pain', category: 'general', severity: 'moderate', duration: '1 month', source: 'voice' }],
    vitals: { temperature: 36.6, pulse: 78, respiratory_rate: 17, spo2: 97, systolic_bp: 134, diastolic_bp: 84, weight: 58, blood_glucose: null },
    triage: 'GREEN',
    summary: 'Chronic knee pain from known osteoarthritis. No red flags, vitals within range.',
    reasoning: ['No danger signs matched by the deterministic rule engine.'],
    recommended_action: 'Advise analgesia as prescribed, warm compresses and gentle mobility; PHC review if pain worsens.',
  },
  {
    member_code: 'WGH-0007',
    asha: 'asha1',
    daysAgo: 6,
    hour: 10,
    visit_type: 'child_check',
    language: 'hi',
    transcript: 'खांसी है और हल्का बुखार, खाना ठीक खा रहा है।',
    symptoms: [
      { name: 'cough', category: 'respiratory', severity: 'mild', duration: '3 days', source: 'voice' },
      { name: 'fever', category: 'general', severity: 'mild', duration: '2 days', source: 'voice' },
    ],
    vitals: { temperature: 37.9, pulse: 106, respiratory_rate: 26, spo2: 97, systolic_bp: null, diastolic_bp: null, weight: 15.1, blood_glucose: null },
    triage: 'YELLOW',
    summary: 'Four-year-old with mild cough and low-grade fever. Respiratory rate normal for age, no chest indrawing, feeding well.',
    reasoning: ['Fever with cough — needs review'],
    recommended_action: 'Symptomatic care and fluids; return immediately if breathing becomes fast or difficult.',
  },
  {
    member_code: 'WGH-0006',
    asha: 'asha1',
    daysAgo: 8,
    hour: 9,
    visit_type: 'antenatal',
    language: 'hi',
    transcript: 'सब ठीक है, कोई शिकायत नहीं है।',
    symptoms: [],
    vitals: { temperature: 36.8, pulse: 84, respiratory_rate: 17, spo2: 99, systolic_bp: 112, diastolic_bp: 72, weight: 49, blood_glucose: null },
    triage: 'GREEN',
    summary: 'Routine second-trimester antenatal check. No complaints, all vitals normal.',
    reasoning: ['No danger signs matched by the deterministic rule engine.'],
    recommended_action: 'Continue iron and folic acid and calcium; next antenatal visit in four weeks.',
  },
  {
    member_code: 'LNK-0009',
    asha: 'asha2',
    daysAgo: 9,
    hour: 14,
    visit_type: 'home_visit',
    language: 'en',
    transcript: 'He had a headache for two days after working in the sun.',
    symptoms: [
      { name: 'headache', category: 'general', severity: 'mild', duration: '2 days', source: 'voice' },
      { name: 'fatigue', category: 'general', severity: 'mild', duration: '2 days', source: 'manual' },
    ],
    vitals: { temperature: 37.2, pulse: 88, respiratory_rate: 18, spo2: 98, systolic_bp: 126, diastolic_bp: 80, weight: 68, blood_glucose: null },
    triage: 'GREEN',
    summary: 'Likely heat-related headache and fatigue after outdoor work. No danger signs.',
    reasoning: ['No danger signs matched by the deterministic rule engine.'],
    recommended_action: 'Advise oral fluids, shade and rest; PHC review if headache persists beyond three days.',
  },
  {
    member_code: 'WGH-0011',
    asha: 'asha1',
    daysAgo: 12,
    hour: 11,
    visit_type: 'home_visit',
    language: 'mr',
    transcript: 'पोटात दुखत आहे आणि दोन वेळा उलटी झाली.',
    symptoms: [
      { name: 'abdominal_pain', category: 'gastrointestinal', severity: 'moderate', duration: '1 day', source: 'voice' },
      { name: 'vomiting', category: 'gastrointestinal', severity: 'mild', duration: '1 day', source: 'voice' },
    ],
    vitals: { temperature: 37.4, pulse: 94, respiratory_rate: 18, spo2: 98, systolic_bp: 118, diastolic_bp: 76, weight: 57, blood_glucose: null },
    triage: 'YELLOW',
    summary: 'One day of moderate abdominal pain with two episodes of vomiting. Abdomen soft, no guarding reported.',
    reasoning: ['Abdominal pain with vomiting — needs review if it persists'],
    recommended_action: 'Advise light diet and ORS; attend the PHC if pain worsens or fever develops.',
  },
]
