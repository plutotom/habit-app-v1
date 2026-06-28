import { defineSchema } from "convex/server";

import { userTables } from "./schemas/users";
import { habitTables } from "./schemas/habits";
import { checkinTables } from "./schemas/checkins";

export default defineSchema({
  ...userTables,
  ...habitTables,
  ...checkinTables,
});
