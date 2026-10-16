export function blockTextAlignment(block: unknown): 'left' | 'center' | 'right' | undefined {
  const value = block && typeof block === 'object' && 'textAlign' in block ? block.textAlign : undefined;
  return value === 'left' || value === 'center' || value === 'right' ? value : undefined;
}
