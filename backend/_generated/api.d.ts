/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as lib_auth from "../lib/auth.js";
import type * as routes_auth_users from "../routes/auth/users.js";
import type * as routes_checkins_mutations from "../routes/checkins/mutations.js";
import type * as routes_checkins_queries from "../routes/checkins/queries.js";
import type * as routes_habits_mutations from "../routes/habits/mutations.js";
import type * as routes_habits_queries from "../routes/habits/queries.js";
import type * as schemas_checkins from "../schemas/checkins.js";
import type * as schemas_habits from "../schemas/habits.js";
import type * as schemas_users from "../schemas/users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "lib/auth": typeof lib_auth;
  "routes/auth/users": typeof routes_auth_users;
  "routes/checkins/mutations": typeof routes_checkins_mutations;
  "routes/checkins/queries": typeof routes_checkins_queries;
  "routes/habits/mutations": typeof routes_habits_mutations;
  "routes/habits/queries": typeof routes_habits_queries;
  "schemas/checkins": typeof schemas_checkins;
  "schemas/habits": typeof schemas_habits;
  "schemas/users": typeof schemas_users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
