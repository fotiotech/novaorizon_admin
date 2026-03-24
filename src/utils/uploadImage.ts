// ✅ No static imports of Firebase – all imports are dynamic inside the function
export async function uploadImage(file: File, folder: string = "product-descriptions"): Promise<string> {
  const { storage } = await import("@/utils/firebaseConfig" as any);          // dynamic import
  const { ref, uploadBytes, getDownloadURL } = await import("firebase/storage");

  const fileName = `${Date.now()}-${file.name}`;
  const storageRef = ref(storage, `${folder}/${fileName}`);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
}