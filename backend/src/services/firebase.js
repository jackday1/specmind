import admin from 'firebase-admin';
import { config } from '../config.js';

let app = null;

export function initFirebase() {
  if (app) return app;
  app = admin.initializeApp({
    credential: admin.credential.cert({
      projectId: config.firebase.projectId,
      clientEmail: config.firebase.clientEmail,
      privateKey: config.firebase.privateKey,
    }),
    storageBucket: config.firebase.storageBucket,
  });
  return app;
}

export function getFirebase() {
  return app;
}

export function getAuth() {
  return admin.auth();
}

export function getStorage() {
  return admin.storage().bucket();
}
