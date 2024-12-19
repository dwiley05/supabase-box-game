import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "xyz",
  "abc"
);


export default supabase;
