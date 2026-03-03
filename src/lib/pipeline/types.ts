export type AgentStatus = "PENDING" | "RUNNING" | "SUCCESS" | "FAILED" | "RETRY" | "FAILED_FINAL";
export type ValidationTier = "PASS" | "WARN" | "BLOCK";

export interface AgentRunState {
  run_id: string;
  agent_id: string;
  status: AgentStatus;
  attempt_count: number;
  input_hash: string;
  output_payload: unknown | null;
  timestamp: string;
}

export interface PipelineRun {
  run_id: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  created_at: string;
  updated_at: string;
  form_input: unknown;
  agents: Record<string, AgentRunState>;
  result?: unknown;
  error?: string;
}
