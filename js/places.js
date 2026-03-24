import { db } from './firebase-init.js';
import {
  collection, doc, getDocs, getDoc,
  addDoc, updateDoc, deleteDoc,
  query, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const COL = 'places';

/**
 * Fetch all places ordered by name.
 * @returns {Promise<Array>}
 */
export async function getPlaces() {
  const q = query(collection(db, COL), orderBy('name'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Fetch a single place by id.
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
export async function getPlace(id) {
  const snap = await getDoc(doc(db, COL, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/**
 * Add a new place. Requires admin auth.
 * @param {Object} data
 * @returns {Promise<string>} new document id
 */
export async function addPlace(data) {
  const ref = await addDoc(collection(db, COL), {
    ...sanitize(data),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return ref.id;
}

/**
 * Update an existing place. Requires admin auth.
 * @param {string} id
 * @param {Object} data
 */
export async function updatePlace(id, data) {
  await updateDoc(doc(db, COL, id), {
    ...sanitize(data),
    updatedAt: serverTimestamp()
  });
}

/**
 * Delete a place. Requires admin auth.
 * @param {string} id
 */
export async function deletePlace(id) {
  await deleteDoc(doc(db, COL, id));
}

// ── internal ───────────────────────────────────────────────────────────────

function sanitize(data) {
  return {
    name:              String(data.name || '').trim(),
    description:       String(data.description || '').trim(),
    location: {
      lat:     Number(data.location?.lat  || 0),
      lng:     Number(data.location?.lng  || 0),
      address: String(data.location?.address || '').trim()
    },
    photos:            Array.isArray(data.photos) ? data.photos.slice(0, 10) : [],
    sketchfabModelId:  data.sketchfabModelId ? String(data.sketchfabModelId).trim() : null
  };
}
