import { HttpInterceptorFn } from '@angular/common/http';

const TOKEN_KEY = 'tw_token';

export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
  if (!token) return next(req);

  return next(req.clone({
    headers: req.headers.set('Authorization', `Bearer ${token}`)
  }));
};
