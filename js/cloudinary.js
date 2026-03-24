// Cloudinary config — api secret is NEVER used on the client.
// All uploads go through an unsigned upload preset.
const CLOUDINARY_CLOUD_NAME = "detmiv4hr";
const CLOUDINARY_UPLOAD_PRESET = "traces_upload";
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

/**
 * Upload a single File object to Cloudinary.
 * @param {File} file
 * @param {function(number):void} [onProgress] - called with 0-100 progress value
 * @returns {Promise<{url: string, publicId: string}>}
 */
export async function uploadImage(file, onProgress) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder", "traces");

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open("POST", CLOUDINARY_UPLOAD_URL);

    if (onProgress) {
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      });
    }

    xhr.onload = () => {
      if (xhr.status === 200) {
        const data = JSON.parse(xhr.responseText);
        resolve({ url: data.secure_url, publicId: data.public_id });
      } else {
        reject(new Error(`Cloudinary upload failed: ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error("Cloudinary upload network error"));
    xhr.send(formData);
  });
}

/**
 * Upload multiple files sequentially with per-file progress.
 * @param {FileList|File[]} files - 1 to 10 files
 * @param {function(number, number, number):void} [onProgress]
 *   Called with (fileIndex, fileProgress 0-100, overallProgress 0-100)
 * @returns {Promise<string[]>} - array of secure URLs
 */
export async function uploadImages(files, onProgress) {
  const fileArray = Array.from(files).slice(0, 10);
  const urls = [];

  for (let i = 0; i < fileArray.length; i++) {
    const url = await uploadImage(fileArray[i], (fileProgress) => {
      if (onProgress) {
        const overall = Math.round(((i + fileProgress / 100) / fileArray.length) * 100);
        onProgress(i, fileProgress, overall);
      }
    });
    urls.push(url.url);
  }

  return urls;
}
