// Types mirroring schema.py from the LanceDB database

export interface Publication {
  pmid: string;
  doi: string;
  title: string;
  journal: string;
  publication_date: string;
  section_title: string;
  section_text: string;
}

export interface Dataset {
  pmid: string;
  doi: string;
  cell_count: number;
  feature_space: string;
  accession_database: string;
  accession_id: string;
  dataset_description: string;
  dataset_uid: string;
}

export interface Gene {
  gene_index: number;
  gene_name: string;
  ensembl_id: string;
  organism: string;
  ensembl_version?: string;
}

export interface Molecule {
  smiles: string;
  pubchem_cid: string;
  iupac_name: string;
}

export interface GeneExpressionRecord {
  cell_uid: string;
  dataset_uid: string;
  assay: string;
  is_control: boolean;
  perturbation_search_string: string;
  chemical_perturbation_uid?: string;
  genetic_perturbation_gene_index?: number;
  genetic_perturbation_method?: string;
}

export interface SearchResult {
  publications: Publication[];
  datasets: Dataset[];
  total_found: number;
  query_used: string;
}

export interface QualityScore {
  experimental_design: number;
  data_quality: number;
  perturbation_characterization: number;
  reproducibility: number;
  biological_relevance: number;
  analytical_methods: number;
  overall: number;
  justification: string;
}

export interface PaperAssessment {
  paper_id: string;
  paper_title: string;
  assessor: "alpha" | "beta" | "gamma";
  scores: QualityScore;
  red_flags: string[];
  recommendation: "include" | "caution" | "exclude";
}

export interface ConvergenceResult {
  paper_id: string;
  paper_title: string;
  assessments: PaperAssessment[];
  consensus: {
    level: "strong" | "moderate" | "divergent";
    overall_score: number;
    dimension_std: Record<string, number>;
    recommendation: string;
  };
}

export interface GeneExpressionResult {
  gene_name: string;
  ensembl_id: string;
  log2_fold_change: number;
  p_value: number;
  adjusted_p_value: number;
  direction: "up" | "down";
}
