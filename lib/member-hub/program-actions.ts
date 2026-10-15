'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { contentSchema, type ContentRecord } from './content';
import { saveContent } from './content-actions';
import { programs, yardSettingsSchema, holidaySettingsSchema, type Program } from './programs';
import { createHubSessionClient, getHubAccount, HubAccessError } from './server';
import { collectReferences } from './asset-library';
import { holidayPages, isHoliday, winnerHoliday, type Holiday } from './holidays';

async function checkImages(value: unknown) {
  const ids = [...collectReferences(value)];
  if (!ids.length) return null;
  try {
    const client = await createHubSessionClient(); await getHubAccount(client, 'admin');
    const result = await client.from('hoa_assets').select('id,mime_type').in('id', ids);
    if (result.error || result.data?.length !== ids.length || result.data.some(asset => !asset.mime_type.startsWith('image/'))) return 'Choose valid image files for photos and backgrounds.';
    return null;
  } catch (error) { return error instanceof HubAccessError ? error.message : 'Unable to check image files.'; }
}

export async function saveProgram(program: Program, input: unknown, version: number, holiday: Holiday = 'christmas') {
  if (!Object.hasOwn(programs, program)) return { error: 'Program not found.' };
  if (!isHoliday(holiday)) return { error: 'Holiday not found.' };
  const parsed = (program === 'yard' ? yardSettingsSchema : holidaySettingsSchema).safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || 'Check page settings.' };
  const imageError = await checkImages(parsed.data); if (imageError) return { error: imageError };
  const info = program === 'holiday' ? { ...programs.holiday, ...holidayPages[holiday] } : programs[program];
  const record: ContentRecord = { id: info.id, kind: 'page', title: info.title, slug: null, status: 'published', visibility: 'public',
    body: [], sections: [], settings: { programSettings: program === 'holiday' ? { ...parsed.data, displayHoliday: holiday } : parsed.data }, version };
  const result = await saveContent(record, version);
  if (result.content) { revalidatePath(info.adminPath); revalidatePath(info.publicPath); }
  return result;
}
export async function saveWinner(program: Program, input: unknown, version: number | null, holiday: Holiday = 'christmas') {
  if (!Object.hasOwn(programs, program)) return { error: 'Program not found.' };
  const parsed = contentSchema.safeParse(input);
  if (!parsed.success || parsed.data.kind !== programs[program].kind) return { error: 'Check winner details.' };
  const settings = parsed.data.settings;
  if (program === 'holiday') {
    if (!isHoliday(holiday) || winnerHoliday(settings.holiday) !== holiday) return { error: 'The winner must match the selected holiday page.' };
    settings.holiday = holiday;
  }
  const imageError = await checkImages([settings.photo, settings.photos]); if (imageError) return { error: imageError };
  if (program === 'yard' && !z.string().regex(/^\d{4}-(0[1-9]|1[0-2])-\d{2}$/).safeParse(settings.month).success) return { error: 'Choose the winner month.' };
  if (program === 'holiday' && (!z.number().int().min(1900).max(9999).safeParse(settings.year).success || !['christmas', 'halloween'].includes(String(settings.holiday)) || !['1', '2', '3', '4', 'shoutout', 'hm'].includes(String(settings.place)))) return { error: 'Choose a holiday, year, and placement.' };
  const result = await saveContent(parsed.data, version);
  if (result.content) { revalidatePath(programs[program].adminPath); revalidatePath(programs[program].publicPath); }
  if (program === 'holiday' && result.content) { revalidatePath(holidayPages[holiday].adminPath); revalidatePath(holidayPages[holiday].publicPath); }
  return result;
}
export async function removeWinner(id: string, version: number) {
  try {
    const client = await createHubSessionClient(); await getHubAccount(client, 'admin');
    const result = await client.rpc('hoa_delete_winner', { target_id: id, expected_version: version });
    if (result.error) return { error: /changed|not found/.test(result.error.message) ? result.error.message : 'Unable to remove winner.' };
    for (const info of Object.values(programs)) { revalidatePath(info.adminPath); revalidatePath(info.publicPath); }
    for (const info of Object.values(holidayPages)) { revalidatePath(info.adminPath); revalidatePath(info.publicPath); }
    return { success: true };
  } catch (error) { return { error: error instanceof HubAccessError ? error.message : 'Unable to remove winner.' }; }
}
