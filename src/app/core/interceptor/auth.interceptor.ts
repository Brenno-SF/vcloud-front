import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environments';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const token = sessionStorage.getItem('token');

    if (!token) {
        return next(req);
    }

    if (!req.url.startsWith(environment.apiUrl)) {
        return next(req);
    }

    const authReq = req.clone({
        setHeaders: {
            Authorization: `Bearer ${token}`
        }
    });

    return next(authReq);
};