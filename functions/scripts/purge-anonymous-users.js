#!/usr/bin/env node
"use strict";

/**
 * Purge des comptes Firebase Auth anonymes inactifs.
 *
 * Usage:
 *   node scripts/purge-anonymous-users.js --days=30 --batch=1000 --apply
 *
 * Par défaut: dry-run (aucune suppression).
 * Flags:
 *   --days=<n>     seuil d'inactivité en jours (défaut: 30)
 *   --batch=<n>    taille max de suppression par appel deleteUsers (défaut: 1000)
 *   --apply        applique réellement les suppressions
 *   --help         affiche cette aide
 */

const admin = require("firebase-admin");

function parseArgs(argv) {
  const out = {
    days: 30,
    batch: 1000,
    apply: false,
    help: false,
  };
  for (const arg of argv) {
    if (arg === "--apply") out.apply = true;
    else if (arg === "--help" || arg === "-h") out.help = true;
    else if (arg.startsWith("--days=")) out.days = Number(arg.split("=")[1]);
    else if (arg.startsWith("--batch=")) out.batch = Number(arg.split("=")[1]);
  }
  if (!Number.isFinite(out.days) || out.days < 0) out.days = 30;
  if (!Number.isFinite(out.batch) || out.batch < 1 || out.batch > 1000) out.batch = 1000;
  return out;
}

function usage() {
  console.log(
      "Usage: node scripts/purge-anonymous-users.js --days=30 --batch=1000 [--apply]",
  );
}

function isAnonymousUser(userRecord) {
  const providers = Array.isArray(userRecord.providerData) ? userRecord.providerData : [];
  return providers.length === 0;
}

function getLastActivityMs(userRecord) {
  const lastSignIn = userRecord.metadata && userRecord.metadata.lastSignInTime ?
    Date.parse(userRecord.metadata.lastSignInTime) : NaN;
  if (Number.isFinite(lastSignIn) && lastSignIn > 0) return lastSignIn;
  const created = userRecord.metadata && userRecord.metadata.creationTime ?
    Date.parse(userRecord.metadata.creationTime) : NaN;
  return Number.isFinite(created) ? created : 0;
}

async function collectInactiveAnonymousUids(cutoffMs) {
  let pageToken;
  let scanned = 0;
  let anonymousCount = 0;
  const toDelete = [];

  do {
    const result = await admin.auth().listUsers(1000, pageToken);
    for (const u of result.users) {
      scanned++;
      if (!isAnonymousUser(u)) continue;
      anonymousCount++;
      const lastActivityMs = getLastActivityMs(u);
      if (lastActivityMs > 0 && lastActivityMs <= cutoffMs) {
        toDelete.push(u.uid);
      }
    }
    pageToken = result.pageToken;
  } while (pageToken);

  return {scanned, anonymousCount, toDelete};
}

async function deleteInBatches(uids, batchSize) {
  let success = 0;
  let failures = 0;

  for (let i = 0; i < uids.length; i += batchSize) {
    const chunk = uids.slice(i, i + batchSize);
    const res = await admin.auth().deleteUsers(chunk);
    success += res.successCount || 0;
    failures += res.failureCount || 0;
    const done = Math.min(i + batchSize, uids.length);
    console.log(`Suppression: ${done}/${uids.length} (ok=${success}, ko=${failures})`);
  }
  return {success, failures};
}

async function main() {
  const cfg = parseArgs(process.argv.slice(2));
  if (cfg.help) {
    usage();
    process.exit(0);
  }

  admin.initializeApp();

  const now = Date.now();
  const cutoffMs = now - cfg.days * 24 * 60 * 60 * 1000;
  const cutoffIso = new Date(cutoffMs).toISOString();

  console.log(`Projet Firebase: ${process.env.GCLOUD_PROJECT || "(défini par credentials)"}`);
  console.log(`Seuil inactivité: ${cfg.days} jours (<= ${cutoffIso})`);
  console.log(`Mode: ${cfg.apply ? "APPLY (suppression réelle)" : "DRY-RUN (aucune suppression)"}`);

  const {scanned, anonymousCount, toDelete} = await collectInactiveAnonymousUids(cutoffMs);
  console.log(`Utilisateurs scannés: ${scanned}`);
  console.log(`Comptes anonymes: ${anonymousCount}`);
  console.log(`Anonymes inactifs ciblés: ${toDelete.length}`);

  if (!cfg.apply || toDelete.length === 0) return;

  const {success, failures} = await deleteInBatches(toDelete, cfg.batch);
  console.log(`Terminé. Supprimés=${success}, échecs=${failures}`);
}

main().catch((err) => {
  console.error("Erreur purge anonymes:", err && err.stack ? err.stack : err);
  process.exit(1);
});

