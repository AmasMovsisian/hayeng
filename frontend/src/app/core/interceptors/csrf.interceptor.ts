import { HttpInterceptorFn } from '@angular/common/http';

const CSRF_COOKIE_NAME = 'csrftoken';
const CSRF_HEADER_NAME = 'X-CSRFToken';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS', 'TRACE']);

function readCookie(name: string): string | null {
  const prefix = `${name}=`;
  const parts = document.cookie.split(';');
  for (const raw of parts) {
    const cookie = raw.trim();
    if (cookie.startsWith(prefix)) {
      return decodeURIComponent(cookie.slice(prefix.length));
    }
  }
  return null;
}

export const csrfInterceptor: HttpInterceptorFn = (req, next) => {
  if (SAFE_METHODS.has(req.method.toUpperCase())) {
    return next(req);
  }

  const token = readCookie(CSRF_COOKIE_NAME);
  if (!token) {
    return next(req);
  }

  const cloned = req.clone({
    setHeaders: { [CSRF_HEADER_NAME]: token },
  });
  return next(cloned);
};