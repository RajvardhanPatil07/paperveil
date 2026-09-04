type PaperVeilToolDefinition = {
  name: string;
  title?: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: {
    readOnlyHint?: boolean;
    untrustedContentHint?: boolean;
    consequentialHint?: boolean;
  };
  execute: (input: never) => Promise<unknown>;
};

interface Document {
  modelContext?: {
    registerTool: (definition: PaperVeilToolDefinition, options?: { signal?: AbortSignal }) => Promise<void> | void;
  };
}
