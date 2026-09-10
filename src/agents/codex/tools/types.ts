// src/agents/codex/tools/types.ts

// ============================================================================
// أنواع التحليل
// ============================================================================
export interface AnalysisResult {
  requirements: string;
  components: Component[];
  effort: EffortEstimate;
  plan: DevelopmentPlan;
  recommendations: string[];
}

export interface Component {
  name: string;
  type: string;
  description: string;
  dependencies: string[];
}

export interface EffortEstimate {
  total: string;
  breakdown: Record<string, string>;
}

export interface DevelopmentPlan {
  phases: Phase[];
  timeline: string;
}

export interface Phase {
  name: string;
  tasks: string[];
  duration: string;
}

export interface SystemAnalysis {
  structure: any;
  dependencies: any;
  weaknesses: string[];
  improvements: string[];
}

// ============================================================================
// أنواع البناء
// ============================================================================
export interface ComponentSpecs {
  name: string;
  type: string;
  description: string;
  requirements: string[];
  dependencies?: string[];
}

export interface BuildResult {
  component: any;
  code: string;
  tests: string;
  docs: string;
  integrated: boolean;
}

export interface SystemArchitecture {
  name: string;
  description: string;
  components: ComponentSpecs[];
  connections: Connection[];
}

export interface Connection {
  from: string;
  to: string;
  type: string;
}

export interface SystemBuildResult {
  system: any;
  components: BuildResult[];
  testsPassed: boolean;
}

// ============================================================================
// أنواع الاختبار
// ============================================================================
export interface TestResult {
  unitTests: TestSuite;
  integrationTests: TestSuite;
  performanceTests: TestSuite;
  securityTests: TestSuite;
  passed: boolean;
}

export interface TestSuite {
  passed: boolean;
  total: number;
  failed: number;
  details: TestCase[];
}

export interface TestCase {
  name: string;
  passed: boolean;
  error?: string;
}

export interface SystemTestResult {
  functionalTests: TestSuite;
  loadTests: TestSuite;
  stressTests: TestSuite;
  recoveryTests: TestSuite;
  systemReady: boolean;
}

// ============================================================================
// أنواع التصحيح
// ============================================================================
export interface DiagnosisResult {
  analysis: string;
  rootCause: string;
  solutions: string[];
  bestSolution: string;
}

export interface Problem {
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  source?: string;
}

export interface FixResult {
  applied: any;
  verified: boolean;
  documented: any;
  prevented: boolean;
}

// ============================================================================
// أنواع التعلم
// ============================================================================
export interface Experience {
  task: string;
  result: any;
  success: boolean;
  lessons?: string[];
}

export interface LearningResult {
  analysis: string;
  lessons: string[];
  updated: any;
  improvements: any;
}

export interface SkillImprovement {
  currentSkills: string[];
  areas: string[];
  developed: string[];
  tested: boolean;
}

// ============================================================================
// أنواع التوثيق
// ============================================================================
export interface Documentation {
  title: string;
  description: string;
  components: ComponentDoc[];
  architecture: ArchitectureDoc;
  api: APIDoc;
  deployment: DeploymentDoc;
}

export interface ComponentDoc {
  name: string;
  purpose: string;
  dependencies: string[];
  usage: string;
  examples: string[];
}

export interface ArchitectureDoc {
  overview: string;
  diagram: string;
  layers: LayerDoc[];
  dataFlow: string;
}

export interface LayerDoc {
  name: string;
  description: string;
  components: string[];
}

export interface APIDoc {
  endpoints: EndpointDoc[];
  authentication: string;
  rateLimiting: string;
}

export interface EndpointDoc {
  path: string;
  method: string;
  description: string;
  parameters: any[];
  responses: any[];
}

export interface DeploymentDoc {
  environment: string;
  resources: string[];
  steps: string[];
}

// ============================================================================
// أنواع النشر
// ============================================================================
export interface DeploymentConfig {
  environment: 'development' | 'staging' | 'production';
  region: string;
  resources: ResourceConfig[];
  monitoring: MonitoringConfig;
}

export interface ResourceConfig {
  type: 'compute' | 'storage' | 'database' | 'ai';
  name: string;
  specs: any;
  dependencies: string[];
}

export interface MonitoringConfig {
  enabled: boolean;
  metrics: string[];
  alerts: AlertConfig[];
}

export interface AlertConfig {
  name: string;
  condition: string;
  action: string;
}

export interface DeploymentResult {
  success: boolean;
  resources: any[];
  network: any;
  applications: any[];
  monitoring: any;
  tested: boolean;
  url: string;
}

export interface UpdateConfig {
  version: string;
  changes: string[];
  force?: boolean;
}

export interface UpdateResult {
  success: boolean;
  version: string;
  updatedAt: Date;
}

// ============================================================================
// أنواع التكامل
// ============================================================================
export interface Integration {
  source: string;
  target: string;
  type: 'api' | 'database' | 'message' | 'file';
  config: any;
}

export interface IntegrationResult {
  success: boolean;
  integrations: Integration[];
  errors: string[];
  logs: string[];
}

// ============================================================================
// أنواع النظام العامة
// ============================================================================
export interface System {
  name: string;
  type: string;
  status: 'running' | 'stopped' | 'error';
  components: any[];
  metadata?: Record<string, any>;
}
