import React from 'react';
import katex from 'katex';

interface TexProps {
  children: string;
  block?: boolean;
  className?: string;
}

/** Renders a LaTeX string with KaTeX. */
export const Tex: React.FC<TexProps> = ({ children, block = false, className }) => {
  const html = katex.renderToString(children, {
    displayMode: block,
    throwOnError: false,
    strict: false,
  });
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
};
