export function formatSize(bytes) {
  if (bytes === 0) return '0 B';

  const units = ['B', 'K', 'M', 'G', 'T'];
  const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const size = bytes / Math.pow(1024, exp);

  if (exp === 0) {
    return `${bytes} B`;
  }

  return `${size.toFixed(1)}${units[exp]}`;
}

export function formatDate(date) {
  if (!date) return '';

  const now = new Date();
  const d = new Date(date);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const month = months[d.getMonth()];
  const day = String(d.getDate()).padStart(2, ' ');

  if (d.getFullYear() === now.getFullYear()) {
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${month} ${day} ${hours}:${mins}`;
  }

  return `${month} ${day}  ${d.getFullYear()}`;
}

export function shortenPath(path, maxLen = 40) {
  if (path.length <= maxLen) return path;

  const parts = path.split('/').filter(Boolean);
  let result = path;

  while (result.length > maxLen && parts.length > 2) {
    parts.shift();
    result = '.../' + parts.join('/');
  }

  if (result.length > maxLen) {
    result = '...' + result.slice(-(maxLen - 3));
  }

  return result;
}

