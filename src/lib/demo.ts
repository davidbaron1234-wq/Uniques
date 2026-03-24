/** The single email address that activates the full demo/investor experience. */
export const DEMO_EMAIL = "davidbaron1234@gmail.com";

export const isDemoUser = (email?: string | null): boolean =>
  email === DEMO_EMAIL;
