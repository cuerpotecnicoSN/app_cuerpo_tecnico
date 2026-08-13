// "TypeError: Failed to fetch" = la petición no llegó a completarse (red, proxy,
// extensión del navegador, suspensión del equipo...). No es un error de datos.
export const isNetworkError = (err: any): boolean => {
  const msg = `${err?.message || ''} ${err?.details || ''} ${err?.name || ''}`;
  return err?.status === 0 || /failed to fetch|networkerror|network request failed|load failed/i.test(msg);
};

// Reintenta una operación de Supabase cuando el fallo es de red.
// Úsalo solo en operaciones idempotentes (UPDATE/DELETE por id), nunca en INSERT.
export const withNetworkRetry = async <T extends { error: any }>(
  run: () => PromiseLike<T>,
  attempts = 3
): Promise<T> => {
  let last: T | undefined;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await run();
      if (!res.error || !isNetworkError(res.error)) return res;
      last = res;
    } catch (err) {
      if (!isNetworkError(err)) throw err;
      last = { error: err } as T;
    }
    if (i < attempts - 1) await new Promise((resolve) => setTimeout(resolve, 500 * (i + 1)));
  }
  return last as T;
};
