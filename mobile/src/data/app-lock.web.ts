// Im Browser gibt es keine App-Sperre.

export async function canLock(): Promise<boolean> {
  return false;
}

export async function unlock(_promptMessage: string): Promise<boolean> {
  return true;
}
