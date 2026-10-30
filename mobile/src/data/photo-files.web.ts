// Im Browser gibt es keinen dauerhaften App-Ordner; Fortschrittsfotos gibt es nur auf dem Handy.

export const PHOTOS_SUPPORTED = false;

export async function storePhoto(_sourceUri: string, _id: string): Promise<string> {
  throw new Error('photos not supported on web');
}

export function photoUri(fileName: string): string {
  return fileName;
}

export function removePhotoFile(_fileName: string) {}
