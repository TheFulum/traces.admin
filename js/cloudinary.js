// Cloudinary config — api secret is NEVER used on the client.
// All uploads go through an unsigned upload preset.
const CLOUDINARY_CLOUD_NAME    = "detmiv4hr";
const CLOUDINARY_UPLOAD_PRESET = "traces_upload";
// images
const CLOUDINARY_IMAGE_URL     = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
// .glb/.gltf must use /raw/upload endpoint
const CLOUDINARY_RAW_URL       = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/raw/upload`;

// ── images ────────────────────────────────────────────────────────────────

export async function uploadImage(file, onProgress) {
  return _upload(CLOUDINARY_IMAGE_URL, file, 'traces/photos', onProgress);
}

export async function uploadImages(files, onProgress) {
  const fileArray = Array.from(files).slice(0, 10);
  const urls = [];
  for (let i = 0; i < fileArray.length; i++) {
    const { url } = await uploadImage(fileArray[i], (pct) => {
      if (onProgress) {
        const overall = Math.round(((i + pct / 100) / fileArray.length) * 100);
        onProgress(i, pct, overall);
      }
    });
    urls.push(url);
  }
  return urls;
}

// ── 3D models ─────────────────────────────────────────────────────────────

/**
 * Upload a .glb or .gltf file via Cloudinary /raw/upload.
 * Preset must allow these extensions in Cloudinary settings.
 * @param {File} file
 * @param {function(number):void} [onProgress]
 * @returns {Promise<string>} secure URL
 */
export async function uploadModel(file, onProgress) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (!['glb', 'gltf'].includes(ext)) {
    throw new Error('Поддерживаются только .glb и .gltf файлы');
  }
  const { url } = await _upload(CLOUDINARY_RAW_URL, file, 'traces/models', onProgress);
  return url;
}

// ── internal ──────────────────────────────────────────────────────────────

function _upload(endpoint, file, folder, onProgress) {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', folder);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', endpoint);

    if (onProgress) {
      xhr.upload.addEventListener('progress', e => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      });
    }

    xhr.onload = () => {
      if (xhr.status === 200) {
        const data = JSON.parse(xhr.responseText);
        resolve({ url: data.secure_url, publicId: data.public_id });
      } else {
        let msg = null;
        try { msg = JSON.parse(xhr.responseText)?.error?.message; } catch {}
        reject(new Error(msg || `Cloudinary error: ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error('Ошибка сети при загрузке файла'));
    xhr.send(formData);
  });
}