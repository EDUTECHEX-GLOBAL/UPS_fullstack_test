import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import ApplicationDocument from '../models/applicationDocumentModel.js';
import { buildFileUrl, resolveS3FileKey } from '../utils/s3FileKey.js';

dotenv.config();

const APPLY = process.argv.includes('--apply');
const DOCUMENT_FIELDS = [
  'cv', 'photo', 'passport', 'transcript', 'diploma',
  'cert9th', 'cert10th', 'cert11th', 'cert12th',
  'testScores', 'languageProficiency', 'recommendationLetter',
];

const exactKey = (value = '') => {
  const key = resolveS3FileKey(value);
  return key.includes('/') ? key : '';
};

const normalizeFile = (file, fallbackKey = '') => {
  if (!file) return { changed: false, unresolved: false };
  const key = exactKey(file.fileKey) || exactKey(file.fileUrl) || exactKey(fallbackKey);
  if (!key) {
    return {
      changed: false,
      unresolved: Boolean(file.fileName || file.originalName || file.fileUrl),
    };
  }

  const fileUrl = buildFileUrl(key);
  const fileName = file.fileName || path.basename(key);
  const changed = file.fileKey !== key || file.fileUrl !== fileUrl || file.fileName !== fileName;
  if (changed) {
    file.fileKey = key;
    file.fileUrl = fileUrl;
    file.fileName = fileName;
  }
  return { changed, unresolved: false, key };
};

const main = async () => {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required');
  await mongoose.connect(process.env.MONGO_URI);

  const personalById = new Map(
    (await Promise.resolve([]).lean()).map((item) => [String(item._id), item])
  );
  const applicationByUser = new Map();
  const unresolved = [];
  const stats = { applicationScanned: 0, applicationUpdated: 0, personalScanned: 0, personalUpdated: 0 };

  for await (const record of ApplicationDocument.find({}).cursor()) {
    stats.applicationScanned += 1;
    let changed = false;
    const personal = personalById.get(String(record.userId));

    for (const field of DOCUMENT_FIELDS) {
      const prefix = field === 'passport' ? 'passport' : field === 'photo' ? 'photograph' : '';
      const fallbackKey = prefix
        ? exactKey(personal?.[`${prefix}FileKey`]) || exactKey(personal?.[`${prefix}FileUrl`])
        : '';
      const result = normalizeFile(record[field], fallbackKey);
      changed ||= result.changed;
      if (result.unresolved) unresolved.push({ collection: 'ApplicationDocument', id: record.id, field });
    }

    for (const file of record.documents || []) {
      const result = normalizeFile(file);
      changed ||= result.changed;
      if (result.unresolved) unresolved.push({ collection: 'ApplicationDocument.documents', id: record.id });
    }

    applicationByUser.set(String(record.userId), record.toObject());
    if (changed) {
      stats.applicationUpdated += 1;
      if (APPLY) await record.save({ validateBeforeSave: false });
    }
  }

  for await (const personal of Promise.resolve([]).cursor()) {
    stats.personalScanned += 1;
    let changed = false;
    const application = applicationByUser.get(String(personal._id));

    for (const [prefix, field] of [['passport', 'passport'], ['photograph', 'photo']]) {
      const appFile = application?.[field];
      const key =
        exactKey(personal[`${prefix}FileKey`]) ||
        exactKey(appFile?.fileKey) ||
        exactKey(personal[`${prefix}FileUrl`]) ||
        exactKey(appFile?.fileUrl);
      const hasFile = personal[`${prefix}FileName`] || personal[`${prefix}OriginalName`] || personal[`${prefix}FileUrl`];

      if (!key) {
        if (hasFile) unresolved.push({ collection: 'PersonalInfo', id: personal.id, field: prefix });
        continue;
      }

      const fileUrl = buildFileUrl(key);
      const fileName = personal[`${prefix}FileName`] || path.basename(key);
      if (
        personal[`${prefix}FileKey`] !== key ||
        personal[`${prefix}FileUrl`] !== fileUrl ||
        personal[`${prefix}FileName`] !== fileName
      ) {
        personal[`${prefix}FileKey`] = key;
        personal[`${prefix}FileUrl`] = fileUrl;
        personal[`${prefix}FileName`] = fileName;
        changed = true;
      }
    }

    if (changed) {
      stats.personalUpdated += 1;
      if (APPLY) await personal.save({ validateBeforeSave: false });
    }
  }

  console.log(JSON.stringify({ mode: APPLY ? 'apply' : 'dry-run', ...stats, unresolved }, null, 2));
};

try {
  await main();
} catch (error) {
  console.error('Document file-key migration failed:', error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
