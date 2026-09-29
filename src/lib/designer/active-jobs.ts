declare global { var __nullkodeActiveJobs: Map<string, string> | undefined; }
export const activeJobs = globalThis.__nullkodeActiveJobs ??= new Map<string, string>();
