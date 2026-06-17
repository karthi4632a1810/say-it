import { Box } from '@mui/material';
import { isGifUrl } from '../../utils/chat';

export function MessageContent({ content }: { content: string }) {
  if (!content.trim()) return null;

  if (isGifUrl(content)) {
    return <Box component="img" src={content.trim()} alt="gif" sx={{ maxWidth: 280, borderRadius: 1, display: 'block' }} />;
  }

  const parts: Array<{ type: 'text' | 'mention' | 'gif'; value: string }> = [];
  const regex = /(@\w+)|(https?:\/\/(?:media\d?\.|i\.)?giphy\.com\/\S+)|(https?:\/\/\S+\.(?:gif|webp)(?:\?\S*)?)/gi;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    if (match.index > last) parts.push({ type: 'text', value: content.slice(last, match.index) });
    if (match[1]) parts.push({ type: 'mention', value: match[1] });
    else if (match[2] || match[3]) parts.push({ type: 'gif', value: match[2] ?? match[3]! });
    last = match.index + match[0].length;
  }
  if (last < content.length) parts.push({ type: 'text', value: content.slice(last) });

  return (
    <Box component="span" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
      {parts.map((p, i) => {
        if (p.type === 'mention') {
          return (
            <Box key={i} component="span" sx={{ color: 'secondary.light', fontWeight: 600 }}>
              {p.value}
            </Box>
          );
        }
        if (p.type === 'gif') {
          return <Box key={i} component="img" src={p.value} alt="gif" sx={{ maxWidth: 240, borderRadius: 1, display: 'block', mt: 0.5 }} />;
        }
        return <span key={i}>{p.value}</span>;
      })}
    </Box>
  );
}

export { AttachmentPreview } from './AttachmentPreview';
export { AttachmentGroup } from './AttachmentGroup';
