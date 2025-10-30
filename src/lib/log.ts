export function getRequestId(request: Request) {
  return request.headers.get("x-request-id") ?? crypto.randomUUID();
}

export function logInfo(message: string, meta: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ level: "info", timestamp: new Date().toISOString(), ...meta, message }));
}

export function logError(message: string, meta: Record<string, unknown> = {}) {
  console.error(
    JSON.stringify({ level: "error", timestamp: new Date().toISOString(), ...meta, message }),
  );
}

