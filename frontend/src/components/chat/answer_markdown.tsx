// Safe markdown renderer for answers: GFM tables, no raw HTML, http(s) links only, [n] citations as pills.
import { memo } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { citation } from '@/lib/api_types';
import { safe_url } from '@/lib/safe_url';
import { CitationPill } from '@/components/chat/citation_pill';

const cite_prefix = '#cite-';

function link_citations(text: string): string {
  return text.replace(/\[(\d{1,3})\](?!\()/g, '[$1](' + cite_prefix + '$1)');
}

function transform_url(url: string): string {
  if (url.startsWith(cite_prefix)) return url;
  return safe_url(url) ?? '';
}

function AnswerMarkdownInner({ text, citations, message_id }: { text: string; citations: citation[]; message_id: string }) {
  const components: Components = {
    a: ({ href, children }) => {
      if (href?.startsWith(cite_prefix)) {
        const id = Number(href.slice(cite_prefix.length));
        return <CitationPill id={id} source={citations.find((c) => c.id === id)} message_id={message_id} />;
      }
      const safe = safe_url(href);
      if (!safe) return <span>{children}</span>;
      return (
        <a href={safe} target="_blank" rel="noopener noreferrer" className="text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-primary">
          {children}
        </a>
      );
    },
    table: ({ children }) => (
      <div className="my-4 overflow-x-auto rounded-[10px] border">
        <table className="m-0 w-full text-[13px]">{children}</table>
      </div>
    ),
  };
  return (
    <div className="prose prose-sm max-w-none text-[15px] leading-[1.75] text-foreground prose-headings:font-serif prose-headings:font-normal prose-headings:tracking-tight prose-headings:text-foreground prose-h2:mb-2 prose-h2:mt-5 prose-h2:text-[22px] prose-h3:mb-1 prose-h3:mt-4 prose-h3:text-[17px] prose-p:my-2.5 prose-strong:font-semibold prose-strong:text-foreground prose-li:my-1 prose-li:marker:text-faint prose-th:bg-surface prose-th:px-3 prose-th:py-2 prose-th:text-left prose-th:font-medium prose-th:text-foreground prose-td:px-3 prose-td:py-2 prose-em:text-muted-foreground dark:prose-invert">
      <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml urlTransform={transform_url} disallowedElements={['img']} components={components}>
        {link_citations(text)}
      </ReactMarkdown>
    </div>
  );
}

export const AnswerMarkdown = memo(AnswerMarkdownInner);
