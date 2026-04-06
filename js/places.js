import { db } from './firebase-init.js';
import {
  collection, doc, getDocs, getDoc,
  addDoc, updateDoc, deleteDoc,
  query, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const COL = 'places';

export async function getPlaces() {
  const q = query(collection(db, COL), orderBy('name'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getPlace(id) {
  const snap = await getDoc(doc(db, COL, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function addPlace(data) {
  const ref = await addDoc(collection(db, COL), {
    ...sanitize(data),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return ref.id;
}

export async function updatePlace(id, data) {
  await updateDoc(doc(db, COL, id), {
    ...sanitize(data),
    updatedAt: serverTimestamp()
  });
}

export async function deletePlace(id) {
  await deleteDoc(doc(db, COL, id));
}

function sanitize(data) {
  return {
    name:         String(data.name        || '').trim(),
    description:  String(data.description || '').trim(),
    openingDate:  String(data.openingDate || '').trim(),
    openingAddress: String(data.openingAddress || '').trim(),
    author:       String(data.author      || '').trim(),
    tags:         Array.isArray(data.tags) ? data.tags.map(t => String(t).trim()).filter(Boolean) : [],
    location: {
      lat:     Number(data.location?.lat  || 0),
      lng:     Number(data.location?.lng  || 0),
      address: String(data.location?.address || '').trim()
    },
    photos:       Array.isArray(data.photos) ? data.photos.slice(0, 10) : [],
    modelUrl:     data.modelUrl ? String(data.modelUrl).trim() : null
  };
}