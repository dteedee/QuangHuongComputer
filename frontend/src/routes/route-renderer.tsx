// JSX half of the route manifest — turns `RouteDef[]`/`RedirectDef[]` (routes/index.ts, plain
// data, no JSX) into `<Route>` elements for App.tsx. Split out so route-types.ts / route-paths.ts /
// index.ts stay plain .ts (importable from anywhere, incl. a future BE-facing codegen script).
import { Route, Navigate, useParams } from 'react-router-dom';
import { RequireAuth } from '../components/RequireAuth';
import { routes, redirects } from './index';
import type { RouteDef, RedirectDef, RouteLayout } from './route-types';

/** Renders a redirect whose target still has `:param` tokens, filled from the CURRENT match's params. */
function ParamRedirect({ to }: { to: string }) {
  const params = useParams();
  const target = to.replace(/:([A-Za-z0-9_]+)/g, (_, key: string) => params[key] ?? '');
  return <Navigate to={target} replace />;
}

function elementFor(route: RouteDef) {
  const Lazy = route.element;
  const page = <Lazy />;
  // Storefront "must be logged in" pages (no specific permission — customers hold none of the
  // Permissions.* catalog) vs. backoffice pages gated by a permission or an explicit role list.
  if (route.requiresAuth || route.permission || route.allowedRoles) {
    return (
      <RequireAuth permission={route.permission} allowedRoles={route.allowedRoles}>
        {page}
      </RequireAuth>
    );
  }
  return page;
}

/** `standalone` paths are already absolute (`/login`); storefront/backoffice ones are relative
 *  to their layout's `<Route path>` mount, exactly as React Router expects for a nested child. */
function redirectRoutePath(redirect: RedirectDef): string {
  if (redirect.layout !== 'standalone') return redirect.from;
  return redirect.from.startsWith('/') ? redirect.from : `/${redirect.from}`;
}

/** All `<Route>` elements for one layout's routes (storefront/backoffice/standalone), in manifest order. */
export function renderRoutesFor(layout: RouteLayout) {
  return routes
    .filter((route) => route.layout === layout)
    .map((route) =>
      route.path === '' ? (
        <Route key={`${layout}:index`} index element={elementFor(route)} />
      ) : (
        <Route key={`${layout}:${route.path}`} path={route.path} element={elementFor(route)} />
      ),
    );
}

/** All `<Route>` redirect elements for one layout — old paths kept alive as `<Navigate replace>`. */
export function renderRedirectsFor(layout: RouteLayout) {
  return redirects
    .filter((redirect) => redirect.layout === layout)
    .map((redirect) => (
      <Route
        key={`redirect:${layout}:${redirect.from}`}
        path={redirectRoutePath(redirect)}
        element={redirect.to.includes(':') ? <ParamRedirect to={redirect.to} /> : <Navigate to={redirect.to} replace />}
      />
    ));
}
