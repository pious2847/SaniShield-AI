require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { initDb, query } = require('../config/database');
const User = require('../models/User');
const SanitationUnit = require('../models/SanitationUnit');
const SensorReading = require('../models/SensorReading');
const Alert = require('../models/Alert');
const Ngo = require('../models/Ngo');
const Gatherer = require('../models/Gatherer');
const RegisteredToilet = require('../models/RegisteredToilet');
const IllegalDumpSite = require('../models/IllegalDumpSite');
const WasteFacility = require('../models/WasteFacility');
const SchoolSanitationMetric = require('../models/SchoolSanitationMetric');
const OdEvent = require('../models/OdEvent');

const UNITS_DATA = [
  {
    name: 'Sakasaka Primary School Block A',
    unit_type: 'flush_toilet', location_name: 'Sakasaka', district: 'Tamale Metro',
    latitude: 9.4215, longitude: -0.8423, capacity: 6,
    is_school: true, school_name: 'Sakasaka Primary School', student_population: 480,
    elevation_meters: 183, flood_zone_risk: 'high', is_solar_powered: true, status: 'critical',
  },
  {
    name: 'Tamale Central Market Sanitation Hub',
    unit_type: 'public_toilet', location_name: 'Central Market, Tamale', district: 'Tamale Metro',
    latitude: 9.4032, longitude: -0.8390, capacity: 12,
    is_school: false, elevation_meters: 179, flood_zone_risk: 'moderate', is_solar_powered: false, status: 'operational',
  },
  {
    name: 'Changli Junior High School Block',
    unit_type: 'pit_latrine', location_name: 'Changli', district: 'Tamale Metro',
    latitude: 9.4389, longitude: -0.8512, capacity: 4,
    is_school: true, school_name: 'Changli JHS', student_population: 320,
    elevation_meters: 181, flood_zone_risk: 'high', is_solar_powered: true, status: 'operational',
  },
  {
    name: 'Kalpohin Health Centre Sanitation',
    unit_type: 'flush_toilet', location_name: 'Kalpohin', district: 'Tamale Metro',
    latitude: 9.4521, longitude: -0.8228, capacity: 3,
    is_school: false, elevation_meters: 185, flood_zone_risk: 'moderate', is_solar_powered: true, status: 'operational',
  },
  {
    name: 'Sagnarigu Primary School Latrine',
    unit_type: 'pit_latrine', location_name: 'Sagnarigu', district: 'Sagnarigu',
    latitude: 9.4610, longitude: -0.8390, capacity: 4,
    is_school: true, school_name: 'Sagnarigu D/A Primary', student_population: 560,
    elevation_meters: 182, flood_zone_risk: 'critical', is_solar_powered: false, status: 'critical',
  },
  {
    name: 'Nyanshegu Community Biodigester',
    unit_type: 'biodigester', location_name: 'Nyanshegu', district: 'Sagnarigu',
    latitude: 9.4730, longitude: -0.8215, capacity: 2,
    is_school: false, elevation_meters: 178, flood_zone_risk: 'high', is_solar_powered: true, status: 'maintenance',
  },
  {
    name: 'Tolon Community School Block',
    unit_type: 'pit_latrine', location_name: 'Tolon', district: 'Tolon',
    latitude: 9.4578, longitude: -1.0802, capacity: 3,
    is_school: true, school_name: 'Tolon D/A Primary', student_population: 280,
    elevation_meters: 174, flood_zone_risk: 'critical', is_solar_powered: false, status: 'operational',
  },
  {
    name: 'Kpene Village Ecosan Unit',
    unit_type: 'ecosan', location_name: 'Kpene Village', district: 'Tolon',
    latitude: 9.4892, longitude: -1.1032, capacity: 2,
    is_school: false, elevation_meters: 171, flood_zone_risk: 'critical', is_solar_powered: false, status: 'operational',
  },
  {
    name: 'Savelugu Senior High School Block',
    unit_type: 'flush_toilet', location_name: 'Savelugu', district: 'Savelugu',
    latitude: 9.6251, longitude: -0.8255, capacity: 8,
    is_school: true, school_name: 'Savelugu Senior High School', student_population: 920,
    elevation_meters: 186, flood_zone_risk: 'moderate', is_solar_powered: true, status: 'operational',
  },
  {
    name: 'Savelugu Market Square Toilet',
    unit_type: 'public_toilet', location_name: 'Savelugu Market', district: 'Savelugu',
    latitude: 9.6205, longitude: -0.8298, capacity: 6,
    is_school: false, elevation_meters: 185, flood_zone_risk: 'low', is_solar_powered: false, status: 'operational',
  },
  {
    name: 'Yendi Municipal Primary Block',
    unit_type: 'pit_latrine', location_name: 'Yendi', district: 'Yendi',
    latitude: 9.4425, longitude: -0.0118, capacity: 5,
    is_school: true, school_name: 'Yendi Municipal Primary', student_population: 410,
    elevation_meters: 191, flood_zone_risk: 'moderate', is_solar_powered: true, status: 'operational',
  },
  {
    name: 'Kumbungu Health Post Sanitation',
    unit_type: 'flush_toilet', location_name: 'Kumbungu', district: 'Kumbungu',
    latitude: 9.5468, longitude: -0.9792, capacity: 2,
    is_school: false, elevation_meters: 176, flood_zone_risk: 'high', is_solar_powered: false, status: 'offline',
  },
];

function randomBetween(min, max) {
  return Math.round((Math.random() * (max - min) + min) * 10) / 10;
}

function generateReadings(unit, count = 24) {
  const readings = [];
  const now = Date.now();
  const isCritical = unit.status === 'critical';
  const isHighRisk = ['high', 'critical'].includes(unit.flood_zone_risk);
  let baseFill = isCritical ? randomBetween(75, 92) : randomBetween(20, 65);
  const fillRate = isCritical ? randomBetween(0.5, 2.0) : randomBetween(-0.1, 0.5);

  for (let i = count; i >= 0; i--) {
    readings.push({
      unit_id: unit.id,
      fill_level_percent: Math.min(100, Math.max(0, Math.round((baseFill + fillRate * (count - i)) * 10) / 10)),
      water_level_cm: isHighRisk ? randomBetween(5, isCritical ? 45 : 20) : randomBetween(0, 5),
      temperature_celsius: randomBetween(28, 38),
      humidity_percent: randomBetween(55, 85),
      gas_ppm: isCritical ? randomBetween(10, 60) : randomBetween(0, 15),
      battery_percent: unit.is_solar_powered ? randomBetween(65, 100) : randomBetween(20, 90),
      signal_strength: Math.round(randomBetween(-80, -40)),
      is_simulated: true,
      recorded_at: new Date(now - i * 3600000).toISOString(),
    });
  }
  return readings;
}

async function seed() {
  console.log('\n🌱 Seeding N.E.X.U.S. Neon PostgreSQL database...\n');

  await initDb();

  // Warm up the Neon connection pool before bulk inserts
  await new Promise(r => setTimeout(r, 3000));
  await query('SELECT 1'); // ping to establish fresh connection
  await new Promise(r => setTimeout(r, 1000));

  // Clear data (V2 tables first due to FK dependencies)
  await query(`
    TRUNCATE broadcast_recipients, broadcasts,
             ngo_agents, ngos, gatherers,
             school_sanitation_metrics, od_events,
             illegal_dump_sites, waste_facilities, registered_toilets,
             maintenance_logs, community_reports, alerts, predictions,
             sensor_readings, sanitation_units, users, weather_cache CASCADE
  `);

  console.log('👤 Creating users...');
  await Promise.all([
    User.create({ name: 'Abdul Rahman', email: 'admin@nexus.gh', password: 'nexus@2024', role: 'admin', phone: '+233241234567', district: 'Tamale Metro' }),
    User.create({ name: 'Fatima Alhassan', email: 'fatima.officer@nexus.gh', password: 'nexus@2024', role: 'district_officer', phone: '+233209876543', district: 'Tamale Metro' }),
    User.create({ name: 'Ibrahim Yakubu', email: 'ibrahim.worker@nexus.gh', password: 'nexus@2024', role: 'sanitation_worker', phone: '+233558765432', district: 'Sagnarigu' }),
    User.create({ name: 'Margaret Asante', email: 'margaret.school@nexus.gh', password: 'nexus@2024', role: 'school_admin', phone: '+233271234567', district: 'Savelugu' }),
    User.create({ name: 'Kofi Mensah', email: 'kofi.ngo@nexus.gh', password: 'nexus@2024', role: 'ngo_staff', phone: '+233204567890', district: null }),
  ]);
  console.log('  ✅ 5 users created');

  console.log('🚽 Creating sanitation units...');
  const createdUnits = [];
  for (const data of UNITS_DATA) {
    createdUnits.push(await SanitationUnit.create(data));
  }
  console.log(`  ✅ ${createdUnits.length} units created`);

  console.log('📡 Generating sensor readings...');
  let totalReadings = 0;
  const allReadings = createdUnits.flatMap(u => generateReadings(u, 24));
  const BATCH = 25;
  for (let i = 0; i < allReadings.length; i += BATCH) {
    const batch = allReadings.slice(i, i + BATCH);
    for (const r of batch) { await SensorReading.create(r); totalReadings++; }
    if (i + BATCH < allReadings.length) await new Promise(res => setTimeout(res, 1500));
  }
  console.log(`  ✅ ${totalReadings} readings created`);

  console.log('🚨 Creating sample alerts...');
  const criticalUnit = createdUnits.find(u => u.status === 'critical');
  if (criticalUnit) {
    await Alert.create({
      unit_id: criticalUnit.id,
      alert_type: 'overflow_imminent',
      severity: 'critical',
      title: `CRITICAL: ${criticalUnit.name} About to Overflow`,
      message: `${criticalUnit.name} has reached 91% capacity. Immediate emptying required.${criticalUnit.is_school ? ` Affects ${criticalUnit.school_name}.` : ''}`,
    });
    await Alert.create({
      unit_id: criticalUnit.id,
      alert_type: 'flood_risk',
      severity: 'danger',
      title: `Flood Risk: ${criticalUnit.name}`,
      message: `Rising water levels at ${criticalUnit.name}. Flood-driven overflow possible within 6 hours.`,
    });
  }
  const offlineUnit = createdUnits.find(u => u.status === 'offline');
  if (offlineUnit) {
    await Alert.create({
      unit_id: offlineUnit.id,
      alert_type: 'system_offline',
      severity: 'warning',
      title: `Sensor Offline: ${offlineUnit.name}`,
      message: `Sensor at ${offlineUnit.name} has gone offline. Last reading was 8 hours ago.`,
    });
  }
  console.log('  ✅ Sample alerts created');

  // ── V2 Seed Data ─────────────────────────────────────────────────────────────
  console.log('🏢 Creating NGOs...');
  const ngo1 = await Ngo.create({
    name: 'WASH Alliance Ghana', acronym: 'WAG',
    org_type: 'ngo', focus_areas: ['water', 'sanitation', 'hygiene'],
    service_districts: ['Tamale Metro', 'Sagnarigu', 'Tolon'],
    description: 'Leading WASH advocacy and implementation in Northern Ghana',
    contact_person: 'Dr. Emmanuel Boateng', contact_phone: '+233241112233',
    contact_email: 'info@washghana.org', district: 'Tamale Metro',
    latitude: 9.4012, longitude: -0.8410, ai_contactable: true, is_active: true,
  });
  const ngo2 = await Ngo.create({
    name: 'UNICEF Northern Region Office', acronym: 'UNICEF-NR',
    org_type: 'un_body', focus_areas: ['child health', 'sanitation', 'education'],
    service_districts: ['Tamale Metro', 'Sagnarigu', 'Savelugu', 'Yendi', 'Tolon'],
    description: 'UNICEF field office coordinating child sanitation and health programmes',
    contact_person: 'Ms. Abena Osei', contact_phone: '+233302234567',
    contact_email: 'northernghana@unicef.org', district: 'Tamale Metro',
    latitude: 9.4087, longitude: -0.8352, ai_contactable: true, is_active: true,
  });
  const ngo3 = await Ngo.create({
    name: 'Ghana Sanitation Foundation', acronym: 'GSF',
    org_type: 'community_org', focus_areas: ['waste management', 'open defecation free'],
    service_districts: ['Kumbungu', 'Nanton', 'Karaga'],
    description: 'Community-led sanitation campaigns and latrine construction',
    contact_person: 'Alhaji Mustapha Issah', contact_phone: '+233244556677',
    contact_email: 'gsf@sanitation.gh', district: 'Kumbungu',
    latitude: 9.5460, longitude: -0.9785, ai_contactable: true, is_active: true,
  });
  await Ngo.addAgent(ngo1.id, { full_name: 'Rashida Bawa', phone: '+233244001122', role: 'field_coordinator', district: 'Tamale Metro', is_active: true, receives_ai_alerts: true });
  await Ngo.addAgent(ngo2.id, { full_name: 'Samuel Asante', phone: '+233551122334', role: 'sanitation_officer', district: 'Sagnarigu', is_active: true, receives_ai_alerts: true });
  console.log('  ✅ 3 NGOs + 2 agents created');

  console.log('🚛 Creating waste gatherers...');
  await Gatherer.create({
    full_name: 'Alhassan Mohammed', phone: '+233244567891', district: 'Tamale Metro',
    service_communities: ['Sakasaka', 'Changli', 'Kalpohin'],
    vehicle_type: 'truck', current_lat: 9.4215, current_lon: -0.8423,
    is_active: true, is_available: true, waste_types: ['human_waste', 'solid_waste'],
    bio_certified: true, ngo_id: ngo1.id, rating: 4.8,
  });
  await Gatherer.create({
    full_name: 'Fatawu Iddrisu', phone: '+233209876541', district: 'Sagnarigu',
    service_communities: ['Nyanshegu', 'Sagnarigu Town'],
    vehicle_type: 'tricycle', current_lat: 9.4730, current_lon: -0.8215,
    is_active: true, is_available: true, waste_types: ['solid_waste', 'recyclables'],
    bio_certified: false, ngo_id: ngo1.id, rating: 4.2,
  });
  await Gatherer.create({
    full_name: 'Yakubu Alidu', phone: '+233558765430', district: 'Tolon',
    service_communities: ['Tolon', 'Kpene'],
    vehicle_type: 'handcart', current_lat: 9.4578, current_lon: -1.0802,
    is_active: true, is_available: false, waste_types: ['human_waste'],
    bio_certified: true, ngo_id: null, rating: 3.9,
  });
  await Gatherer.create({
    full_name: 'Comfort Asante', phone: '+233271234560', district: 'Savelugu',
    service_communities: ['Savelugu Town', 'Pong Tamale'],
    vehicle_type: 'truck', current_lat: 9.6251, current_lon: -0.8255,
    is_active: true, is_available: true, waste_types: ['human_waste', 'medical_waste'],
    bio_certified: true, ngo_id: ngo2.id, rating: 4.6,
  });
  await Gatherer.create({
    full_name: 'Ibrahim Seidu', phone: '+233244001234', district: 'Kumbungu',
    service_communities: ['Kumbungu', 'Wuba'],
    vehicle_type: 'truck', current_lat: 9.5468, current_lon: -0.9792,
    is_active: true, is_available: true, waste_types: ['solid_waste', 'human_waste'],
    bio_certified: false, ngo_id: ngo3.id, rating: 4.0,
  });
  console.log('  ✅ 5 gatherers created');

  console.log('🚽 Creating registered toilets...');
  await RegisteredToilet.create({
    owner_name: 'Madam Aishatu', owner_phone: '+233244789012', toilet_type: 'pit_latrine',
    ownership_type: 'household', location_name: 'Sakasaka', district: 'Tamale Metro',
    community: 'Sakasaka', latitude: 9.4220, longitude: -0.8430,
    condition: 'good', num_users: 8, has_water: false, has_handwashing: true,
  });
  await RegisteredToilet.create({
    owner_name: 'Tamale Central Mosque', owner_phone: '+233302112233', toilet_type: 'flush_toilet',
    ownership_type: 'public', location_name: 'Tamale Central', district: 'Tamale Metro',
    community: 'Central Tamale', latitude: 9.4040, longitude: -0.8395,
    condition: 'good', num_users: 200, has_water: true, has_handwashing: true,
  });
  await RegisteredToilet.create({
    owner_name: 'Mr. Fuseini', owner_phone: '+233551234560', toilet_type: 'ventilated_pit',
    ownership_type: 'household', location_name: 'Nyanshegu', district: 'Sagnarigu',
    community: 'Nyanshegu', latitude: 9.4735, longitude: -0.8220,
    condition: 'fair', num_users: 12, has_water: false, has_handwashing: false,
  });
  await RegisteredToilet.create({
    owner_name: 'Tolon Market Committee', owner_phone: '+233244567800', toilet_type: 'pit_latrine',
    ownership_type: 'public', location_name: 'Tolon Market', district: 'Tolon',
    community: 'Tolon', latitude: 9.4580, longitude: -1.0810,
    condition: 'poor', num_users: 150, has_water: false, has_handwashing: false,
  });
  await RegisteredToilet.create({
    owner_name: 'Kumbungu Health Post', owner_phone: '+233209001122', toilet_type: 'flush_toilet',
    ownership_type: 'health_facility', location_name: 'Kumbungu Health Centre', district: 'Kumbungu',
    community: 'Kumbungu', latitude: 9.5470, longitude: -0.9795,
    condition: 'fair', num_users: 50, has_water: true, has_handwashing: true,
  });
  console.log('  ✅ 5 registered toilets created');

  console.log('🗑️ Creating illegal dump sites...');
  await IllegalDumpSite.create({
    district: 'Tamale Metro', community: 'Kukuo', latitude: 9.3980, longitude: -0.8550,
    severity: 'high', waste_types: ['solid_waste', 'plastic', 'organic'],
    estimated_volume_m3: 15, description: 'Large open dump near residential area and drainage channel',
    reporter_name: 'Community Watch', status: 'open',
  });
  await IllegalDumpSite.create({
    district: 'Sagnarigu', community: 'Nyanshegu', latitude: 9.4750, longitude: -0.8200,
    severity: 'critical', waste_types: ['human_waste', 'solid_waste'],
    estimated_volume_m3: 8, description: 'Open defecation site 200m from primary school',
    reporter_name: 'School Head Teacher', status: 'open', assigned_ngo_id: ngo3.id,
  });
  await IllegalDumpSite.create({
    district: 'Tolon', community: 'Tolon', latitude: 9.4600, longitude: -1.0820,
    severity: 'moderate', waste_types: ['solid_waste', 'organic'],
    estimated_volume_m3: 5, description: 'Roadside dump blocking drainage',
    reporter_name: 'District Assembly', status: 'assigned',
  });
  console.log('  ✅ 3 illegal dump sites created');

  console.log('🏭 Creating waste facilities...');
  await WasteFacility.create({
    name: 'Tamale Waste Treatment Plant', facility_type: 'sewage_treatment',
    operator: 'Tamale Metro Assembly', district: 'Tamale Metro',
    community: 'Lamashegu Industrial Area', latitude: 9.3890, longitude: -0.8612,
    capacity_m3: 5000, current_load_pct: 65, status: 'operational',
    contact_name: 'Eng. Kofi Acheampong', contact_phone: '+233302445566',
    operating_hours: 'Mon-Fri 07:00-18:00', accepts_waste_types: ['sewage', 'industrial_effluent'],
  });
  await WasteFacility.create({
    name: 'Sagnarigu Compost Site', facility_type: 'composting',
    operator: 'Sagnarigu District Assembly', district: 'Sagnarigu',
    community: 'Sagnarigu West', latitude: 9.4490, longitude: -0.8410,
    capacity_m3: 800, current_load_pct: 40, status: 'operational',
    contact_name: 'Mr. Aziz Mahama', contact_phone: '+233551223344',
    operating_hours: 'Daily 06:00-18:00', accepts_waste_types: ['organic', 'biodegradable'],
  });
  await WasteFacility.create({
    name: 'Yendi Landfill Site', facility_type: 'landfill',
    operator: 'Yendi Municipal Assembly', district: 'Yendi',
    community: 'Yendi East', latitude: 9.4500, longitude: -0.0050,
    capacity_m3: 10000, current_load_pct: 78, status: 'operational',
    contact_name: 'Alhaji Sumaila', contact_phone: '+233244778899',
    operating_hours: 'Mon-Sat 07:00-17:00', accepts_waste_types: ['solid_waste', 'non-hazardous'],
  });
  console.log('  ✅ 3 waste facilities created');

  console.log('🏫 Creating school sanitation metrics...');
  const school1Data = {
    school_name: 'Sakasaka Primary School', district: 'Tamale Metro', community: 'Sakasaka',
    latitude: 9.4215, longitude: -0.8423, student_count: 480, girl_count: 235, boy_count: 245,
    total_toilets: 8, girl_toilets: 4, boy_toilets: 4, has_handwashing: true,
    has_menstrual_hygiene: false, health_score: 72,
  };
  school1Data.meets_unicef_standard = SchoolSanitationMetric.computeUnicefStandard(school1Data);
  await SchoolSanitationMetric.save(school1Data);

  const school2Data = {
    school_name: 'Sagnarigu D/A Primary', district: 'Sagnarigu', community: 'Sagnarigu',
    latitude: 9.4610, longitude: -0.8390, student_count: 560, girl_count: 280, boy_count: 280,
    total_toilets: 4, girl_toilets: 2, boy_toilets: 2, has_handwashing: false,
    has_menstrual_hygiene: false, health_score: 38,
  };
  school2Data.meets_unicef_standard = SchoolSanitationMetric.computeUnicefStandard(school2Data);
  await SchoolSanitationMetric.save(school2Data);
  console.log('  ✅ 2 school sanitation metrics created');

  console.log('⚠️ Creating OD events...');
  await OdEvent.create({
    district: 'Sagnarigu', community: 'Nyanshegu', latitude: 9.4755, longitude: -0.8195,
    near_school: true, school_name: 'Sagnarigu D/A Primary', distance_to_school_m: 180,
    reporter_name: 'Anonymous', description: 'Open defecation observed near school fence during early morning',
    severity: 'high',
  });
  await OdEvent.create({
    district: 'Tolon', community: 'Kpene', latitude: 9.4898, longitude: -1.1040,
    near_school: false,
    reporter_name: 'Community Leader', description: 'Multiple households defecating in open field due to lack of latrines',
    severity: 'moderate',
  });
  console.log('  ✅ 2 OD events created');

  console.log('\n✨ Full V2 Seed complete!\n');
  console.log('📋 Login credentials:');
  console.log('  admin@nexus.gh              / nexus@2024');
  console.log('  fatima.officer@nexus.gh     / nexus@2024');
  console.log('  ibrahim.worker@nexus.gh     / nexus@2024');
  console.log('  margaret.school@nexus.gh    / nexus@2024');
  console.log('  kofi.ngo@nexus.gh           / nexus@2024\n');
  console.log('🗺️  V2 Data Summary:');
  console.log('  3 NGOs + 2 agents | 5 gatherers | 5 registered toilets');
  console.log('  3 dump sites | 3 waste facilities | 2 school metrics | 2 OD events\n');

  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
