const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Comments, strings (incl. f-strings), Python + SQL keywords, numbers.
const TOK = new RegExp(
  [
    /(#[^\n]*)/.source,
    /([fr]?"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')/.source,
    /\b(import|from|if|elif|else|for|while|in|return|def|class|async|await|with|try|except|not|and|or|as|is|True|False|None|continue|break|INSERT|INTO|VALUES|ON|CONFLICT|DO|UPDATE|SET|CASE|WHEN|THEN|ELSE|END|AND|IS|NULL|NOT|RETURNING|GREATEST|INTERVAL|NOW)\b/.source,
    /\b(\d[\d_.]*)\b/.source,
  ].join('|'),
  'g'
);

/** Minimal syntax highlighter for the typing code panels. Uses the .c/.s/.k/.n classes from globals.css. */
export function highlightCode(src: string): string {
  let out = '';
  let last = 0;
  let m: RegExpExecArray | null;
  TOK.lastIndex = 0;
  while ((m = TOK.exec(src)) !== null) {
    out += esc(src.slice(last, m.index));
    if (m[1]) out += '<span class="c">' + esc(m[1]) + '</span>';
    else if (m[2]) out += '<span class="s">' + esc(m[2]) + '</span>';
    else if (m[3]) out += '<span class="k">' + esc(m[3]) + '</span>';
    else out += '<span class="n">' + esc(m[4]) + '</span>';
    last = m.index + m[0].length;
  }
  return out + esc(src.slice(last));
}
