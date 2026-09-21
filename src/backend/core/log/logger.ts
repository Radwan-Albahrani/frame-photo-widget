type Dimensions = Record<string, unknown>;

function serialize(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  return String(error);
}

export function reportFailure(context: Dimensions & { op: string }, error: unknown): void {
  const { op, ...dimensions } = context;
  console.warn(op, { ...dimensions, error: serialize(error) });
}

export async function bestEffort<T>(
  work: Promise<T>,
  context: Dimensions & { op: string }
): Promise<T | null> {
  try {
    return await work;
  } catch (error) {
    reportFailure(context, error);
    return null;
  }
}
