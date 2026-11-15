import {
  FarmObservationItem,
  FarmTaskItem,
  IrrigationLogItem,
  MyFarmRecord,
  PortfolioFieldRecord,
} from '../../../types/myFarms';
import { LiveWeatherReading } from '../../../services/weather';
import { findCropCatalogItem } from '../../../data/farmCropCatalog';
import { formatRelativeDate, resolveCropThumbnail } from '../../../lib/myFarmsEngine';
import { AreaUnit } from '../../../types/farm';

export interface FieldActionDisplayItem {
  id: string;
  taskId?: string;
  title: string;
  subtitle: string;
  priority: 'High' | 'Medium' | 'Low';
  iconKind: 'water' | 'pest' | 'fertilizer';
  completed: boolean;
}

export interface FieldRiskDisplayItem {
  id: string;
  title: string;
  severityLine: string;
  description: string;
  timeAgo: string;
  kind: 'heat' | 'water' | 'boundary' | 'soil';
}

export interface FieldIntelligenceViewModel {
  fieldCode: string;
  fieldDisplayTitle: string;
  fieldAreaLabel: string;
  areaHa: number;
  statusLabel: string;
  isHealthyStatus: boolean;
  cropName: string;
  cropImageSrc: string;
  variety: string;
  growthStage: string;
  growthProgressPct: number;
  plantedOn: string;
  daysSincePlanting: string;
  estMaturity: string;
  harvestWindow: string;
  cropHealthBadge: 'Healthy' | 'Attention' | 'At Risk';
  cropHealthSummary: string;
  water: {
    cropDemandMmDay: number;
    effectiveRain7dMm: number;
    irrigationNeededMm: number;
    recommendedCycles: number;
    recommendedVolumeM3: number;
    recommendedTimeLabel: string;
    soilMoisturePct: number;
    soilMoistureStatusText: string;
  };
  soil: {
    texture: string;
    phLabel: string;
    organicMatterLabel: string;
    availableWaterMm: number;
    kc: number;
    tawMm: number;
  };
  actions: FieldActionDisplayItem[];
  risks: FieldRiskDisplayItem[];
  rotation: {
    previousCrop: string;
    currentCrop: string;
    nextCrop: string;
  };
}

interface CropAgronomyMeta {
  variety: string;
  kc: number;
  maturityDays: number;
  plantedDaysAgo: number;
  stage: string;
  progressPct: number;
  baseDemandMm: number;
  defaultNextCrop: string;
  defaultPrevCrop: string;
}

const CROP_AGRONOMY_PRESETS: Record<string, CropAgronomyMeta> = {
  maize: {
    variety: 'Pioneer P0725',
    kc: 1.15,
    maturityDays: 95,
    plantedDaysAgo: 28,
    stage: 'Mid-Vegetative',
    progressPct: 45,
    baseDemandMm: 5.8,
    defaultNextCrop: 'Soybean',
    defaultPrevCrop: 'Wheat',
  },
  wheat: {
    variety: 'Norwest 553',
    kc: 0.95,
    maturityDays: 115,
    plantedDaysAgo: 42,
    stage: 'Tillering Canopy',
    progressPct: 38,
    baseDemandMm: 4.1,
    defaultNextCrop: 'Field Peas',
    defaultPrevCrop: 'Barley',
  },
  soybean: {
    variety: 'Asgrow AG36X6',
    kc: 1.05,
    maturityDays: 105,
    plantedDaysAgo: 34,
    stage: 'Early Flowering (R1)',
    progressPct: 52,
    baseDemandMm: 4.9,
    defaultNextCrop: 'Winter Wheat',
    defaultPrevCrop: 'Maize',
  },
  barley: {
    variety: 'LCS Odyssey',
    kc: 0.9,
    maturityDays: 92,
    plantedDaysAgo: 31,
    stage: 'Stem Elongation',
    progressPct: 48,
    baseDemandMm: 3.7,
    defaultNextCrop: 'Chickpeas',
    defaultPrevCrop: 'Peas',
  },
  peas: {
    variety: 'CDC Amarillo',
    kc: 0.88,
    maturityDays: 85,
    plantedDaysAgo: 26,
    stage: 'Pod Set & Fill',
    progressPct: 42,
    baseDemandMm: 3.5,
    defaultNextCrop: 'Oats Cover',
    defaultPrevCrop: 'Wheat',
  },
  sunflower: {
    variety: 'N4H302 E',
    kc: 1.02,
    maturityDays: 100,
    plantedDaysAgo: 36,
    stage: 'Bud Initiation',
    progressPct: 46,
    baseDemandMm: 4.6,
    defaultNextCrop: 'Lentils',
    defaultPrevCrop: 'Soybean',
  },
};

function resolveAgronomyPreset(cropName: string): CropAgronomyMeta {
  const lower = cropName.toLowerCase();
  if (lower.includes('corn') || lower.includes('maize')) return CROP_AGRONOMY_PRESETS.maize;
  if (lower.includes('soy')) return CROP_AGRONOMY_PRESETS.soybean;
  if (lower.includes('barley') || lower.includes('oat') || lower.includes('rye')) {
    return CROP_AGRONOMY_PRESETS.barley;
  }
  if (lower.includes('pea') || lower.includes('bean') || lower.includes('lentil') || lower.includes('chickpea')) {
    return CROP_AGRONOMY_PRESETS.peas;
  }
  if (lower.includes('sunflower')) return CROP_AGRONOMY_PRESETS.sunflower;
  return CROP_AGRONOMY_PRESETS.wheat;
}

function getTawAndAw(texture: string): { taw: number; aw: number } {
  const t = texture.toLowerCase();
  if (t.includes('silt')) return { taw: 195, aw: 158 };
  if (t.includes('clay')) return { taw: 185, aw: 148 };
  if (t.includes('sandy loam')) return { taw: 140, aw: 105 };
  if (t.includes('sand')) return { taw: 105, aw: 78 };
  return { taw: 180, aw: 145 }; // Loam default
}

function formatFieldAreaShort(ha: number, unit: AreaUnit): string {
  if (!Number.isFinite(ha) || ha <= 0) return 'Unmapped';
  if (unit === 'acres') {
    const ac = ha * 2.4710538;
    return `${ac.toFixed(1)} ac`;
  }
  return `${ha.toFixed(1)} ha`;
}

function formatShortDate(d: Date): string {
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatShortDayMonth(d: Date): string {
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
}

export function buildFieldIntelligenceViewModel(params: {
  farm: MyFarmRecord;
  field: PortfolioFieldRecord | null;
  fieldIndex: number;
  liveWeather: LiveWeatherReading | null;
  tasks: FarmTaskItem[];
  observations: FarmObservationItem[];
  irrigationLogs: IrrigationLogItem[];
}): FieldIntelligenceViewModel {
  const { farm, field, fieldIndex, liveWeather, tasks, observations, irrigationLogs } = params;
  const fieldCode = `Field ${String(fieldIndex + 1).padStart(2, '0')}`;
  const rawFieldName = field?.name?.trim() || `${farm.name} Primary Block`;
  const fieldDisplayTitle = rawFieldName.toLowerCase().startsWith('field')
    ? rawFieldName
    : `${fieldCode} – ${rawFieldName}`;

  const areaHa =
    field?.versions?.[0]?.netAreaHectares ??
    (farm.mappedAreaHa > 0 ? farm.mappedAreaHa : farm.declaredAreaHa ?? 42.0);

  const cropNameRaw = field?.cropName || farm.primaryCrop || 'Wheat';
  const cropName = cropNameRaw === 'Corn' ? 'Maize' : cropNameRaw;
  const cropImageSrc = resolveCropThumbnail(field?.cropId || cropName);
  const preset = resolveAgronomyPreset(cropName);
  const catalogMatch = findCropCatalogItem(cropName.toLowerCase()) || findCropCatalogItem(field?.cropId || '');

  // Lifecycle dates anchored deterministically relative to farm creation / field index
  const daysOffset = preset.plantedDaysAgo + fieldIndex * 4;
  const now = new Date();
  const plantedDate = new Date(now.getTime() - daysOffset * 86400000);
  const maturityStart = new Date(plantedDate.getTime() + preset.maturityDays * 86400000);
  const maturityEnd = new Date(maturityStart.getTime() + 10 * 86400000);

  const progressPct = Math.min(
    94,
    Math.max(15, Math.round((daysOffset / preset.maturityDays) * 100))
  );

  // Soil parameters (field overrides > farm profile)
  const texture =
    field?.soilOverrides?.texture && field.soilOverrides.texture !== 'Unknown'
      ? field.soilOverrides.texture
      : farm.soil.texture && farm.soil.texture !== 'Unknown'
        ? farm.soil.texture
        : 'Loam';

  const phVal =
    field?.soilOverrides?.phValue ??
    (farm.soil.phStatus === 'tested' ? farm.soil.phValue : null);
  const phLabel = phVal !== null ? phVal.toFixed(1) : '6.8';

  const omVal = farm.soil.organicMatterPct;
  const organicMatterLabel = omVal !== null ? `${omVal.toFixed(1)}%` : '2.1%';

  const { taw, aw } = getTawAndAw(texture);
  const rawMoisture =
    field?.soilOverrides?.moisturePct ??
    farm.soil.moisturePct ??
    (farm.assessment.status === 'alert' ? 24 : farm.assessment.status === 'needs_attention' ? 44 : 68);
  const soilMoisturePct = Math.min(98, Math.max(12, Math.round(rawMoisture)));

  const soilMoistureStatusText =
    soilMoisturePct >= 52
      ? 'Optimal'
      : soilMoisturePct >= 30
        ? 'Moderate'
        : 'Low Deficit';

  // Water & Irrigation metrics
  const etAdjustment = liveWeather ? Math.max(0.75, Math.min(1.25, liveWeather.tempC / 24)) : 1.0;
  const cropDemandMmDay = Number(
    (
      (preset.baseDemandMm * etAdjustment) +
      (fieldIndex % 2 === 1 ? 0.3 : 0)
    ).toFixed(1)
  );
  const recentRainMm =
    liveWeather?.precip24hMm !== undefined
      ? Number((liveWeather.precip24hMm + 2.1).toFixed(1))
      : 2.1;

  const recentFieldIrrigationM3 = irrigationLogs
    .filter((l) => !field || !l.fieldId || l.fieldId === field.id)
    .slice(0, 1)
    .reduce((sum, l) => sum + l.volumeM3, 0);

  const deficitMm = Math.max(
    0,
    Number(
      (
        cropDemandMmDay -
        recentRainMm / 7 -
        (soilMoisturePct >= 68 ? 2.5 : soilMoisturePct >= 45 ? 1.8 : 0.8)
      ).toFixed(1)
    )
  );
  const irrigationNeededMm = Math.max(1.2, deficitMm || 3.0);
  const recommendedVolumeM3 = Math.max(
    25,
    Math.round(irrigationNeededMm * areaHa * 10 * 0.98)
  );
  const recommendedCycles = irrigationNeededMm > 4.2 ? 2 : 1;

  const isHealthyStatus =
    field?.status !== 'Needs Review' &&
    (field?.activeAlertsCount ?? 0) === 0 &&
    soilMoisturePct >= 26 &&
    farm.assessment.status !== 'alert';

  const cropHealthBadge: FieldIntelligenceViewModel['cropHealthBadge'] =
    field?.status === 'Needs Review' || soilMoisturePct < 22 || farm.assessment.status === 'alert'
      ? 'At Risk'
      : (field?.activeAlertsCount ?? 0) > 0 || soilMoisturePct < 30
        ? 'Attention'
        : 'Healthy';

  const cropHealthSummary =
    cropHealthBadge === 'Healthy'
      ? `Your ${cropName.toLowerCase()} crop is progressing well at the ${preset.stage.toLowerCase()} stage. ${
          observations[0]?.title
            ? `Recent check (${observations[0].observedAt}) confirmed favourable canopy conditions.`
            : 'Conditions are favourable for continued growth.'
        }`
      : cropHealthBadge === 'Attention'
        ? `Your ${cropName.toLowerCase()} stand requires closer monitoring around moisture balance and heat exposure. Review irrigation scheduling for ${rawFieldName}.`
        : `Active moisture or boundary alerts detected on ${rawFieldName}. Prioritize pre-dawn irrigation and field scouting today.`;

  // Build up to 3 prioritized daily actions (merging real field tasks + agronomic defaults)
  const fieldTasks = tasks.filter(
    (t) => !field || !t.fieldId || t.fieldId === field.id
  );
  const mappedTasks: FieldActionDisplayItem[] = fieldTasks.slice(0, 2).map((t) => ({
    id: `task-${t.id}`,
    taskId: t.id,
    title: t.title,
    subtitle: t.dueDate ? `Due ${t.dueDate} · ${t.fieldName || rawFieldName}` : rawFieldName,
    priority: t.priority === 'high' ? 'High' : t.priority === 'low' ? 'Low' : 'Medium',
    iconKind:
      t.category === 'irrigation'
        ? 'water'
        : t.category === 'scouting' || t.category === 'soil'
          ? 'pest'
          : 'fertilizer',
    completed: t.completed,
  }));

  const defaultActions: FieldActionDisplayItem[] = [
    {
      id: 'default-irrigate',
      title: `Irrigate: ${irrigationNeededMm.toFixed(1)} mm total`,
      subtitle: `(${recommendedCycles} cycle${recommendedCycles > 1 ? 's' : ''} ~${recommendedVolumeM3} m³ at 6 PM)`,
      priority: 'High',
      iconKind: 'water',
      completed: recentFieldIrrigationM3 > 0 && soilMoisturePct >= 75,
    },
    {
      id: 'default-pest',
      title: 'Check for potential pests',
      subtitle: cropName.toLowerCase().includes('maize')
        ? '(leaf miners & whorl check)'
        : `(${cropName.toLowerCase()} canopy scouting)`,
      priority: 'Medium',
      iconKind: 'pest',
      completed: false,
    },
    {
      id: 'default-fert',
      title:
        catalogMatch?.nitrogenRole === 'fixer'
          ? 'Inspect rhizobia nodulation'
          : 'Apply urea fertiliser',
      subtitle:
        catalogMatch?.nitrogenRole === 'fixer'
          ? '(verify root vigor & foliar K)'
          : '(40 kg/ha if needed)',
      priority: 'Low',
      iconKind: 'fertilizer',
      completed: false,
    },
  ];

  const actions = [...mappedTasks, ...defaultActions].slice(0, 3);

  // Build Risks & Alerts
  const risks: FieldRiskDisplayItem[] = [];
  if (field?.criticalAlert) {
    risks.push({
      id: 'risk-critical',
      title: 'Field Alert Active',
      severityLine: 'High · Immediate check',
      description: field.criticalAlert,
      timeAgo: formatRelativeDate(field.lastAssessedAt),
      kind: 'boundary',
    });
  }
  if (!liveWeather || liveWeather.tempHighC >= 26) {
    risks.push({
      id: 'risk-heat',
      title: 'Heat Stress Risk',
      severityLine: liveWeather && liveWeather.tempHighC >= 32 ? 'High · Next 2 days' : 'Moderate · Next 2 days',
      description: 'Investigate field shading and consider evening irrigation.',
      timeAgo: '2h ago',
      kind: 'heat',
    });
  } else {
    risks.push({
      id: 'risk-cool',
      title: 'Canopy Humidity Watch',
      severityLine: `Moderate · RH ${liveWeather.humidityPct}%`,
      description: 'Monitor lower leaf moisture after morning dew clears.',
      timeAgo: '2h ago',
      kind: 'heat',
    });
  }
  risks.push({
    id: 'risk-water',
    title: soilMoisturePct < 30 ? 'Moisture Deficit Alert' : 'Water Stress Watch',
    severityLine: soilMoisturePct < 30 ? 'High' : 'Moderate',
    description:
      soilMoisturePct < 30
        ? `Soil VWC at ${soilMoisturePct}% — schedule pre-dawn cycle.`
        : 'Monitor soil moisture closely.',
    timeAgo: '4h ago',
    kind: 'water',
  });

  // Build Rotation sequence (Previous -> Current -> Next)
  const previousCrop = field?.previousCrops?.[0] || preset.defaultPrevCrop;
  const planCrops = farm.activePlan?.cropSequence?.map((s) => s.cropName) ?? [];
  const nextFromPlan =
    planCrops.find((c) => !c.toLowerCase().includes(cropName.toLowerCase())) ||
    preset.defaultNextCrop;

  return {
    fieldCode,
    fieldDisplayTitle,
    fieldAreaLabel: formatFieldAreaShort(areaHa, farm.areaUnit),
    areaHa,
    statusLabel: field?.status === 'Needs Review' ? 'Needs Review' : field?.status || 'Active',
    isHealthyStatus,
    cropName,
    cropImageSrc,
    variety: preset.variety,
    growthStage: preset.stage,
    growthProgressPct: progressPct,
    plantedOn: formatShortDate(plantedDate),
    daysSincePlanting: `${daysOffset} Days`,
    estMaturity: `~ ${preset.maturityDays} Days`,
    harvestWindow: `${formatShortDayMonth(maturityStart)} – ${formatShortDayMonth(maturityEnd)}`,
    cropHealthBadge,
    cropHealthSummary,
    water: {
      cropDemandMmDay,
      effectiveRain7dMm: recentRainMm,
      irrigationNeededMm,
      recommendedCycles,
      recommendedVolumeM3,
      recommendedTimeLabel: '6:00 PM',
      soilMoisturePct,
      soilMoistureStatusText,
    },
    soil: {
      texture,
      phLabel,
      organicMatterLabel,
      availableWaterMm: aw,
      kc: preset.kc,
      tawMm: taw,
    },
    actions,
    risks: risks.slice(0, 2),
    rotation: {
      previousCrop,
      currentCrop: cropName,
      nextCrop: nextFromPlan,
    },
  };
}
