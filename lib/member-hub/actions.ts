'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { emailSchema, passwordSchema, profileSchema, type HubActionResult, type DirectoryMember } from './forms';
import { createHubSessionClient, createHubStorageClient, createHubUserClient, getHubAccount, HubAccessError } from './server';
import { hubSiteOrigin } from './config';

function callback(next = '/members') {
  const url = new URL('/auth/confirm', hubSiteOrigin());
  url.searchParams.set('next', next);
  return url.toString();
}

async function perform(action: () => Promise<HubActionResult>): Promise<HubActionResult> {
  try { return await action(); }
  catch (error) {
    if (error instanceof z.ZodError) return { error: error.issues[0]?.message || 'Check your details.' };
    if (error instanceof HubAccessError) return { error: error.message };
    return { error: 'We could not complete that request. Please try again.' };
  }
}

export async function signIn(form: FormData) {
  return perform(async () => {
    const email = emailSchema.parse(form.get('email'));
    const password = z.string().min(1, 'Enter your password.').max(128).parse(form.get('password'));
    const client = await createHubSessionClient();
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) return { error: 'Unable to sign in. Check your email and password, and confirm your email.' };
    return { redirect: '/members' };
  });
}

export async function signInAdmin(form: FormData) {
  return perform(async () => {
    const email = emailSchema.parse(form.get('email'));
    const password = z.string().min(1, 'Enter your password.').max(128).parse(form.get('password'));
    const client = await createHubSessionClient();
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) return { error: 'Unable to sign in. Check your email and password, and confirm your email.' };
    try { await getHubAccount(client, 'admin'); }
    catch {
      await client.auth.signOut({ scope: 'local' });
      return { error: 'An active, invited admin account is required.' };
    }
    return { redirect: '/admin/content' };
  });
}

export async function register(form: FormData) {
  return perform(async () => {
    const email = emailSchema.parse(form.get('email'));
    const password = passwordSchema.parse(form.get('password'));
    const profile = profileSchema.parse(Object.fromEntries(form));
    const client = await createHubSessionClient();
    const { error } = await client.auth.signUp({ email, password, options: { data: profile, emailRedirectTo: callback() } });
    if (error) return { error: 'Registration could not be completed. Try again, or sign in to an existing account.' };
    return { success: 'Check your email to confirm your account. Admin approval is required for member access.' };
  });
}

export async function recoverPassword(form: FormData) {
  return perform(async () => {
    const email = emailSchema.parse(form.get('email'));
    const client = await createHubSessionClient();
    const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: callback('/reset-password') });
    if (error) return { error: 'Unable to send a reset link right now. Please try again shortly.' };
    return { success: 'If an account exists for that email, a password reset link is on its way.' };
  });
}

export async function resendConfirmation(form: FormData) {
  return perform(async () => {
    const email = emailSchema.parse(form.get('email'));
    const client = await createHubSessionClient();
    const { error } = await client.auth.resend({ type: 'signup', email, options: { emailRedirectTo: callback() } });
    if (error) return { error: 'Unable to send a confirmation link right now. Please try again shortly.' };
    return { success: 'If your account needs confirmation, a new email link is on its way.' };
  });
}

export async function resetPassword(form: FormData) {
  return perform(async () => {
    const password = passwordSchema.parse(form.get('password'));
    if (password !== form.get('confirm_password')) return { error: 'Passwords do not match.' };
    const client = await createHubSessionClient();
    await getHubAccount(client);
    const { error } = await client.auth.updateUser({ password });
    if (error) return { error: 'Unable to update your password. Request a new reset link and try again.' };
    return { redirect: '/members' };
  });
}

export async function signOut() {
  return perform(async () => {
    const client = await createHubSessionClient();
    const { error } = await client.auth.signOut({ scope: 'local' });
    if (error) return { error: 'Unable to sign out. Please try again.' };
    return { redirect: '/login' };
  });
}

export async function saveProfile(form: FormData) {
  return perform(async () => {
    const profile = profileSchema.parse(Object.fromEntries(form));
    const client = await createHubSessionClient();
    const { user } = await getHubAccount(client);
    const { error } = await client.from('hoa_profiles').update(profile).eq('id', user!.id);
    if (error) return { error: 'Unable to save your account details.' };
    revalidatePath('/members');
    return { success: 'Account details saved.' };
  });
}

export async function setMembership(form: FormData) {
  return perform(async () => {
    const id = z.string().uuid().parse(form.get('id'));
    const status = z.enum(['approved', 'revoked']).parse(form.get('status'));
    const client = await createHubSessionClient();
    await getHubAccount(client, 'admin');
    const { error } = await client.rpc('hoa_set_membership', { target_id: id, new_status: status });
    if (error) return { error: 'Unable to update membership. Approval requires a verified email, name and address.' };
    revalidatePath('/admin/members');
    return { success: status === 'approved' ? 'Membership approved.' : 'Member access revoked.' };
  });
}

export async function removeAccount(form: FormData) {
  return perform(async () => {
    const client = await createHubSessionClient();
    const { user, profile } = await getHubAccount(client);
    const id = z.string().uuid().parse(form.get('id'));
    if (id !== user!.id) await getHubAccount(client, 'admin');
    const password = z.string().min(1, 'Enter your current password.').max(128).parse(form.get('password'));
    const reauth = createHubUserClient();
    const { error: passwordError } = await reauth.auth.signInWithPassword({ email: user!.email!, password });
    if (passwordError) return { error: 'Your current password is incorrect.' };
    await reauth.auth.signOut({ scope: 'local' });
    // Recheck privileges after reauthentication, before calling the server-only Admin API.
    await getHubAccount(client, id === user!.id ? 'account' : 'admin');
    const preferences = await client.rpc('hoa_prepare_account_removal', { target: id, unsubscribe: form.get('unsubscribe_newsletter') === 'on' });
    if (preferences.error) return { error: 'Account removal preferences could not be saved.' };
    const { error } = await createHubStorageClient().auth.admin.deleteUser(id);
    if (error) return { error: 'Account could not be removed. The last active admin must remain.' };
    if (id === profile!.id) {
      await client.auth.signOut({ scope: 'local' });
      return { redirect: '/login?removed=1' };
    }
    revalidatePath('/admin/members');
    return { success: 'Account removed. Comments and RSVPs are now attributed to User Cleared.' };
  });
}

export async function inviteAdmin(form: FormData) {
  return perform(async () => {
    const email = emailSchema.parse(form.get('email'));
    const client = await createHubSessionClient();
    await getHubAccount(client, 'admin');
    const { data: id, error } = await client.rpc('hoa_issue_admin_invitation', { invitee_email: email });
    if (error || !id) return { error: 'Unable to create an admin invitation.' };
    const redirectTo = callback(`/members/accept-invite?id=${id}`);
    const { data: directory, error: directoryError } = await client.rpc('hoa_member_directory');
    const existing = !directoryError && (directory as DirectoryMember[]).some(person => person.email.toLowerCase() === email);
    const result = existing
      ? await createHubUserClient().auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: redirectTo } })
      : await createHubStorageClient().auth.admin.inviteUserByEmail(email, { redirectTo });
    if (result.error) {
      await client.rpc('hoa_revoke_admin_invitation', { invitation_id: id });
      return { error: 'Unable to send the invitation. Please try again.' };
    }
    revalidatePath('/admin/members');
    return { success: 'Admin invitation sent. It expires in seven days.' };
  });
}

export async function revokeInvitation(form: FormData) {
  return perform(async () => {
    const id = z.string().uuid().parse(form.get('id'));
    const client = await createHubSessionClient();
    await getHubAccount(client, 'admin');
    const { error } = await client.rpc('hoa_revoke_admin_invitation', { invitation_id: id });
    if (error) return { error: 'Unable to revoke the invitation.' };
    revalidatePath('/admin/members');
    return { success: 'Invitation revoked.' };
  });
}

export async function acceptInvitation(form: FormData) {
  return perform(async () => {
    const id = z.string().uuid().parse(form.get('id'));
    const password = passwordSchema.parse(form.get('password'));
    const name = profileSchema.shape.full_name.parse(form.get('full_name'));
    const client = await createHubSessionClient();
    const { user } = await getHubAccount(client);
    const { error: passwordError } = await client.auth.updateUser({ password });
    if (passwordError) return { error: 'Unable to set your password. Please try again.' };
    const { error: profileError } = await client.from('hoa_profiles').update({ full_name: name }).eq('id', user!.id);
    if (profileError) return { error: 'Unable to save your name.' };
    const { error } = await client.rpc('hoa_accept_admin_invitation', { invitation_id: id });
    if (error) return { error: 'This invitation is invalid, expired or already used.' };
    return { redirect: '/admin/members' };
  });
}
