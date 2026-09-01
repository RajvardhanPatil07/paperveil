type PaperVeilToolDefinition = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: { readOnlyHint?: boolean; destructiveHint?: boolean; idempotentHint?: boolean };
  execute: (input: never) => Promise<unknown>;
};

interface Document {
  modelContext?: {
    registerTool: (definition: PaperVeilToolDefinition, options?: { signal?: AbortSignal }) => Promise<void> | void;
  };
}
