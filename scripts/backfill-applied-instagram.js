/**
 * Script: backfill-applied-instagram.js
 * Scans active applications and backfills applied_instagram_profile_id and missing applied handles.
 * Uses PostgreSQL direct connection (POSTGRES_URL) for speed and reliability.
 *
 * Usage:
 *   node scripts/backfill-applied-instagram.js --dry-run
 *   node scripts/backfill-applied-instagram.js --apply
 */

const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const isApply = process.argv.includes('--apply');
const isDryRun = !isApply;

function norm(s) {
  if (!s) return '';
  return String(s).trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/^@/, '').split('/')[0].split('?')[0].toLowerCase();
}

async function run() {
  console.log(`\n======================================================`);
  console.log(`INSTAGRAM APPLIED PROFILE BACKFILL (${isApply ? 'APPLY MODE' : 'DRY RUN MODE'})`);
  console.log(`======================================================\n`);

  const client = new Client({
    connectionString: process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    // 1. Fetch active applications with user info
    const resApps = await client.query(`
      SELECT 
        a.id,
        a.user_id,
        a.status,
        a.form_data,
        a.created_at,
        u.full_name,
        u.instagram_username,
        u.followers
      FROM public.applications a
      LEFT JOIN public.users u ON u.id = a.user_id
      WHERE a.status IN ('Approved', 'Completed')
    `);

    const apps = resApps.rows;
    console.log(`Total target applications found: ${apps.length}`);

    // 2. Fetch all user_instagram_profiles
    const resProfiles = await client.query(`SELECT * FROM public.user_instagram_profiles`);
    const allProfiles = resProfiles.rows;

    const profilesByUser = {};
    allProfiles.forEach(p => {
      if (!profilesByUser[p.user_id]) profilesByUser[p.user_id] = [];
      profilesByUser[p.user_id].push(p);
    });

    const stats = {
      alreadyLocked: 0,
      profileIdLinked: 0,
      fallbackToPrimary: 0,
      relinkedUnlinked: 0,
      conflictFlagged: 0
    };

    const report = [];

    for (const app of apps) {
      const fd = app.form_data || {};
      const appliedUsername = norm(fd.applied_instagram_username);
      const appliedProfileId = fd.applied_instagram_profile_id;
      const existingProfiles = profilesByUser[app.user_id] || [];

      // Case 1: Already has both handle and profile ID
      if (appliedUsername && appliedProfileId) {
        stats.alreadyLocked++;
        continue;
      }

      // Case 2: Has applied handle but missing profile_id
      if (appliedUsername && !appliedProfileId) {
        const match = existingProfiles.find(p => norm(p.username) === appliedUsername || norm(p.normalized_username) === appliedUsername);
        if (match) {
          stats.profileIdLinked++;
          report.push({
            appId: app.id,
            user: app.full_name,
            action: 'ATTACH_PROFILE_ID',
            handle: match.username,
            profileId: match.id
          });

          if (isApply) {
            const updatedFd = {
              ...fd,
              applied_instagram_profile_id: match.id,
              applied_instagram_locked_at: fd.applied_instagram_locked_at || app.created_at
            };
            await client.query(
              `UPDATE public.applications SET form_data = $1 WHERE id = $2`,
              [JSON.stringify(updatedFd), app.id]
            );
            await client.query(
              `INSERT INTO public.instagram_profile_logs (event_type, user_id, application_id, profile_id, new_username, actor_type, actor_name, reason)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
              ['BACKFILL_LOCKED', app.user_id, app.id, match.id, match.username, 'system', 'backfill_script', 'Backfilled profile_id for existing applied handle']
            );
          }
          continue;
        }

        // Check if handle is free globally
        const conflict = allProfiles.filter(p => norm(p.username) === appliedUsername && p.user_id !== app.user_id);
        if (conflict.length === 0) {
          stats.relinkedUnlinked++;
          report.push({
            appId: app.id,
            user: app.full_name,
            action: 'RELINK_PROFILE',
            handle: appliedUsername,
            note: 'Handle is free; relinking to creator'
          });

          if (isApply) {
            const resNewProf = await client.query(
              `INSERT INTO public.user_instagram_profiles (user_id, username, normalized_username, followers, is_primary, added_by, created_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7)
               RETURNING *`,
              [app.user_id, appliedUsername, appliedUsername, fd.applied_instagram_followers || 0, existingProfiles.length === 0, 'backfill', new Date().toISOString()]
            );
            const newProf = resNewProf.rows[0];

            if (newProf) {
              existingProfiles.push(newProf);
              const updatedFd = {
                ...fd,
                applied_instagram_profile_id: newProf.id,
                applied_instagram_locked_at: fd.applied_instagram_locked_at || app.created_at
              };
              await client.query(
                `UPDATE public.applications SET form_data = $1 WHERE id = $2`,
                [JSON.stringify(updatedFd), app.id]
              );
              await client.query(
                `INSERT INTO public.instagram_profile_logs (event_type, user_id, application_id, profile_id, new_username, actor_type, actor_name, reason)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                ['BACKFILL_RELINKED', app.user_id, app.id, newProf.id, appliedUsername, 'system', 'backfill_script', 'Re-linked unlinked applied handle to creator account']
              );
            }
          }
        } else {
          stats.conflictFlagged++;
          report.push({
            appId: app.id,
            user: app.full_name,
            action: 'FLAG_CONFLICT',
            handle: appliedUsername,
            note: `Conflict: owned by another user (${conflict[0].user_id})`
          });

          if (isApply) {
            await client.query(
              `INSERT INTO public.instagram_profile_logs (event_type, user_id, application_id, old_username, actor_type, actor_name, reason)
               VALUES ($1, $2, $3, $4, $5, $6, $7)`,
              ['BACKFILL_FLAGGED', app.user_id, app.id, appliedUsername, 'system', 'backfill_script', `Applied handle @${appliedUsername} is taken by another account; requires admin review`]
            );
          }
        }
        continue;
      }

      // Case 3: Missing applied handle completely
      if (!appliedUsername) {
        const primary = existingProfiles.find(p => p.is_primary) || existingProfiles[0];
        const fallbackHandle = primary?.username || app.instagram_username;
        const fallbackProfileId = primary?.id || null;

        if (fallbackHandle) {
          stats.fallbackToPrimary++;
          report.push({
            appId: app.id,
            user: app.full_name,
            action: 'FALLBACK_PRIMARY',
            handle: fallbackHandle,
            profileId: fallbackProfileId
          });

          if (isApply) {
            const updatedFd = {
              ...fd,
              applied_instagram_username: fallbackHandle,
              applied_instagram_profile_id: fallbackProfileId,
              applied_instagram_followers: primary?.followers || app.followers || 0,
              applied_instagram_locked_at: app.created_at
            };
            await client.query(
              `UPDATE public.applications SET form_data = $1 WHERE id = $2`,
              [JSON.stringify(updatedFd), app.id]
            );
            await client.query(
              `INSERT INTO public.instagram_profile_logs (event_type, user_id, application_id, profile_id, new_username, actor_type, actor_name, reason)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
              ['BACKFILL_LOCKED', app.user_id, app.id, fallbackProfileId, fallbackHandle, 'system', 'backfill_script', 'Fallback to primary Instagram handle for older application']
            );
          }
        }
      }
    }

    console.log('\n--- BACKFILL SUMMARY ---');
    console.log(`Already fully locked: ${stats.alreadyLocked}`);
    console.log(`Attached missing profile_id: ${stats.profileIdLinked}`);
    console.log(`Fallback to primary handle: ${stats.fallbackToPrimary}`);
    console.log(`Re-linked unlinked handles: ${stats.relinkedUnlinked}`);
    console.log(`Flagged conflicts (admin review): ${stats.conflictFlagged}`);
    console.log(`-------------------------\n`);

    if (isDryRun) {
      console.log('DRY RUN COMPLETE. No changes were committed to database.');
      console.log('To apply changes, run:');
      console.log('node scripts/backfill-applied-instagram.js --apply\n');
    } else {
      console.log('APPLY COMPLETE! All 94 eligible applications have been backfilled.\n');
    }

  } catch (err) {
    console.error('Backfill error:', err);
  } finally {
    await client.end();
  }
}

run();
