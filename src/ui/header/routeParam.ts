export function routeParam(params: object | undefined, key: string): string {
  if (params === undefined || !(key in params)) return "";
  const value: unknown = Reflect.get(params, key);
  return typeof value === "string" ? value : "";
}
