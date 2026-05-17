import { supabase } from "@/integrations/supabase/client";

// We hide auth complexity: child picks a username + 4-digit PIN.
// We synthesize a deterministic email so Supabase Auth still works.
const slug = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
export const usernameToEmail = (username: string) => `${slug(username)}@kid.emosense.app`;
export const pinToPassword = (pin: string) => `EmoSense#${pin}!safe`;

export async function signUpChild(opts: { username: string; pin: string; displayName: string; avatar: string; }) {
  const email = usernameToEmail(opts.username);
  const password = pinToPassword(opts.pin);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/app`,
      data: { display_name: opts.displayName, avatar: opts.avatar, username: slug(opts.username) },
    },
  });
  return { data, error };
}

export async function signInChild(username: string, pin: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: usernameToEmail(username),
    password: pinToPassword(pin),
  });
  return { data, error };
}

export async function signOut() {
  await supabase.auth.signOut();
}
