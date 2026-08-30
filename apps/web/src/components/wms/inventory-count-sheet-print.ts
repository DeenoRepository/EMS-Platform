export function escapeHtml(value: string | number | null | undefined): string {
  return Array.from(String(value ?? ''))
    .map((character) => {
      switch (character.charCodeAt(0)) {
        case 38:
          return '&' + 'amp;';
        case 60:
          return '&' + 'lt;';
        case 62:
          return '&' + 'gt;';
        case 34:
          return '&' + 'quot;';
        case 39:
          return '&' + '#39;';
        default:
          return character;
      }
    })
    .join('');
}
