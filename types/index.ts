export type InputType = 'pathogen' | 'uniprot_id' | 'sequence';
export type PipelineStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'paused'
  | 'cancelled';
export type PipelineNode = 'N1' | 'N2' | 'N3' | 'N4' | 'N6' | 'N7';
export interface PipelineRunRequest {
  input_type: InputType;
  input_value: string;
  max_proteins?: number;
  protein_name?: string;
}
export interface PipelineRunResponse {
  run_id: string;
  status: PipelineStatus;
}
export interface PipelineStatusResponse {
  run_id: string;
  status: PipelineStatus;
  current_node: PipelineNode | null;
  progress: number;
  message: string;
  started_at: string | null;
  completed_at: string | null;
}
export interface CoverageDetail {
  mhc_i_pct: number;
  mhc_ii_pct: number;
  combined_pct: number;
  population_label: string;
}
export interface Epitope {
  sequence: string;
  epitope_type: 'CTL' | 'HTL' | 'B-cell';
  hla_allele: string;
  ic50_nm: number | null;
  percentile_rank: number | null;
  confidence: 'high' | 'medium' | 'low';
  allergenicity_safe: boolean | null;
  toxicity_safe: boolean | null;
}
export interface Decision {
  stage: string;
  decision: string;
  reasoning: string;
  per_population?: Record<string, CoverageDetail>;
}
export interface Candidate {
  protein_id: string;
  protein_name: string;
  sequence_length: number;
  ctl_count: number;
  ctl_strong: number;
  htl_count: number;
  bcell_count: number;
  global_coverage_pct: number;
  african_coverage_pct: number;
  epitopes: Epitope[];
  decisions: Decision[];
  coverage_detail: Record<string, CoverageDetail>;
}
export interface PipelineTiming {
  total_seconds: number;
  n3_tcell: number;
  n4_bcell: number;
  n6_safety: number;
  n7_coverage: number;
}
export interface PipelineResults {
  run_id: string;
  status: PipelineStatus;
  timing: PipelineTiming;
  candidates: Candidate[];
}
export interface RunSummary {
  id: string;
  pathogen_name: string | null;
  input_type: InputType;
  status: PipelineStatus;
  created_at: string;
  completed_at: string | null;
  epitope_count?: number;
  global_coverage?: number;
}
export interface NodeInfo {
  id: PipelineNode;
  label: string;
  description: string;
  shortDesc: string;
}
export const PIPELINE_NODES: NodeInfo[] = [
  {
    id: 'N1',
    label: 'Data Curation',
    description:
      'Fetching proteome from UniProt & NCBI, filtering human-similar proteins',
    shortDesc: 'Proteome fetch',
  },
  {
    id: 'N2',
    label: 'Antigen Screening',
    description:
      'Identifying surface-exposed antigenic proteins via PSORTb & VaxiJen',
    shortDesc: 'Surface antigens',
  },
  {
    id: 'N3',
    label: 'T-Cell Prediction',
    description: 'Predicting CTL & HTL epitopes via NetMHCpan & IEDB',
    shortDesc: 'CTL/HTL epitopes',
  },
  {
    id: 'N4',
    label: 'B-Cell Prediction',
    description: 'Identifying antibody-binding regions via BepiPred',
    shortDesc: 'Antibody targets',
  },
  {
    id: 'N6',
    label: 'Safety Screening',
    description: 'Checking allergenicity (AllerTOP) & toxicity (ToxinPred)',
    shortDesc: 'Safety checks',
  },
  {
    id: 'N7',
    label: 'Population Coverage',
    description: 'Calculating HLA coverage across 7 global populations',
    shortDesc: 'HLA coverage',
  },
];
