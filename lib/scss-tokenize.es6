const SINGLE_QUOTE      = '\''.charCodeAt(0);
const DOUBLE_QUOTE      =  '"'.charCodeAt(0);
const BACKSLASH         = '\\'.charCodeAt(0);
const SLASH             =  '/'.charCodeAt(0);
const NEWLINE           = '\n'.charCodeAt(0);
const SPACE             =  ' '.charCodeAt(0);
const FEED              = '\f'.charCodeAt(0);
const TAB               = '\t'.charCodeAt(0);
const CR                = '\r'.charCodeAt(0);
const OPEN_SQUARE       =  '['.charCodeAt(0);
const CLOSE_SQUARE      =  ']'.charCodeAt(0);
const OPEN_PARENTHESES  =  '('.charCodeAt(0);
const CLOSE_PARENTHESES =  ')'.charCodeAt(0);
const OPEN_CURLY        =  '{'.charCodeAt(0);
const CLOSE_CURLY       =  '}'.charCodeAt(0);
const SEMICOLON         =  ';'.charCodeAt(0);
const ASTERICK          =  '*'.charCodeAt(0);
const COLON             =  ':'.charCodeAt(0);
const AT                =  '@'.charCodeAt(0);

// SCSS PATCH {
const COMMA             =  ','.charCodeAt(0);
const HASH              =  '#'.charCodeAt(0);
// } SCSS PATCH

const RE_AT_END      = /[ \n\t\r\f\{\(\)'"\\;/\[\]#]/g;
const RE_WORD_END    = /[ \n\t\r\f\(\)\{\}:;@!'"\\\]\[#]|\/(?=\*)/g;
const RE_BAD_BRACKET = /.[\\\/\("'\n]/;

const RE_NEW_LINE    = /[\r\f\n]/g; // SCSS PATCH

// SCSS PATCH function name was changed
export default function scssTokenize(input, options = { }) {
    let tokens = [];
    let css    = input.css.valueOf();

    let ignore = options.ignoreErrors;

    let code, next, quote, lines, last, content, escape,
        nextLine, nextOffset, escaped, escapePos, prev, n;

    let brackets; // SCSS PATCH

    let length = css.length;
    let offset = -1;
    let line   =  1;
    let pos    =  0;

    function unclosed(what) {
        throw input.error('Unclosed ' + what, line, pos - offset);
    }

    while ( pos < length ) {
        code = css.charCodeAt(pos);

        if ( code === NEWLINE || code === FEED ||
             code === CR && css.charCodeAt(pos + 1) !== NEWLINE ) {
            offset = pos;
            line  += 1;
        }

        switch ( code ) {
        case NEWLINE:
        case SPACE:
        case TAB:
        case CR:
        case FEED:
            next = pos;
            do {
                next += 1;
                code = css.charCodeAt(next);
                if ( code === NEWLINE ) {
                    offset = next;
                    line  += 1;
                }
            } while ( code === SPACE   ||
                      code === NEWLINE ||
                      code === TAB     ||
                      code === CR      ||
                      code === FEED );

            tokens.push(['space', css.slice(pos, next)]);
            pos = next - 1;
            break;

        case OPEN_SQUARE:
            tokens.push(['[', '[', line, pos - offset]);
            break;

        case CLOSE_SQUARE:
            tokens.push([']', ']', line, pos - offset]);
            break;

        case OPEN_CURLY:
            tokens.push(['{', '{', line, pos - offset]);
            break;

        case CLOSE_CURLY:
            tokens.push(['}', '}', line, pos - offset]);
            break;

        // SCSS PATCH {
        case COMMA:
            tokens.push([
                'word',
                ',',
                line, pos - offset,
                line, pos - offset + 1
            ]);
            break;
        // } SCSS PATCH

        case COLON:
            tokens.push([':', ':', line, pos - offset]);
            break;

        case SEMICOLON:
            tokens.push([';', ';', line, pos - offset]);
            break;

        case OPEN_PARENTHESES:
            prev = tokens.length ? tokens[tokens.length - 1][1] : '';
            n    = css.charCodeAt(pos + 1);
            if ( prev === 'url' && n !== SINGLE_QUOTE && n !== DOUBLE_QUOTE &&
                                   n !== SPACE && n !== NEWLINE && n !== TAB &&
                                   n !== FEED && n !== CR ) {
                // SCSS PATCH {
                brackets = 1;
                escaped  = false;
                next     = pos + 1;
                while ( next <= css.length - 1 ) {
                    n = css.charCodeAt(next);
                    if ( n === BACKSLASH ) {
                        escaped = !escaped;
                    } else if ( n === OPEN_PARENTHESES ) {
                        brackets += 1;
                    } else if ( n === CLOSE_PARENTHESES ) {
                        brackets -= 1;
                        if ( brackets === 0 ) break;
                    }
                    next += 1;
                }
                // } SCSS PATCH

                tokens.push(['brackets', css.slice(pos, next + 1),
                    line, pos  - offset,
                    line, next - offset
                ]);
                pos = next;

            } else {
                next    = css.indexOf(')', pos + 1);
                content = css.slice(pos, next + 1);

                if ( next === -1 || RE_BAD_BRACKET.test(content) ) {
                    tokens.push(['(', '(', line, pos - offset]);
                } else {
                    tokens.push(['brackets', content,
                        line, pos  - offset,
                        line, next - offset
                    ]);
                    pos = next;
                }
            }

            break;

        case CLOSE_PARENTHESES:
            tokens.push([')', ')', line, pos - offset]);
            break;

        case SINGLE_QUOTE:
        case DOUBLE_QUOTE:
            quote = code === SINGLE_QUOTE ? '\'' : '"';
            next  = pos;
            do {
                escaped = false;
                next    = css.indexOf(quote, next + 1);
                if ( next === -1 ) {
                    if ( ignore ) {
                        next = pos + 1;
                        break;
                    } else {
                        unclosed('quote');
                    }
                }
                escapePos = next;
                while ( css.charCodeAt(escapePos - 1) === BACKSLASH ) {
                    escapePos -= 1;
                    escaped = !escaped;
                }
            } while ( escaped );

            content = css.slice(pos, next + 1);
            lines   = content.split('\n');
            last    = lines.length - 1;

            if ( last > 0 ) {
                nextLine   = line + last;
                nextOffset = next - lines[last].length;
            } else {
                nextLine   = line;
                nextOffset = offset;
            }

            tokens.push(['string', css.slice(pos, next + 1),
                line, pos  - offset,
                nextLine, next - nextOffset
            ]);

            offset = nextOffset;
            line   = nextLine;
            pos    = next;
            break;

        case AT:
            RE_AT_END.lastIndex = pos + 1;
            RE_AT_END.test(css);
            if ( RE_AT_END.lastIndex === 0 ) {
                next = css.length - 1;
            } else {
                next = RE_AT_END.lastIndex - 2;
            }
            tokens.push(['at-word', css.slice(pos, next + 1),
                line, pos  - offset,
                line, next - offset
            ]);
            pos = next;
            break;

        case BACKSLASH:
            next   = pos;
            escape = true;
            while ( css.charCodeAt(next + 1) === BACKSLASH ) {
                next  += 1;
                escape = !escape;
            }
            code = css.charCodeAt(next + 1);
            if ( escape && (code !== SLASH   &&
                            code !== SPACE   &&
                            code !== NEWLINE &&
                            code !== TAB     &&
                            code !== CR      &&
                            code !== FEED ) ) {
                next += 1;
            }
            tokens.push(['word', css.slice(pos, next + 1),
                line, pos  - offset,
                line, next - offset
            ]);
            pos = next;
            break;

        default:
            // SCSS PATCH {
            n = css.charCodeAt(pos + 1);

            if ( code === HASH && n === OPEN_CURLY ) {
                let deep = 1;
                next = pos;
                while ( deep > 0 ) {
                    next += 1;
                    if ( css.length <= next ) unclosed('interpolation');

                    code  = css.charCodeAt(next);
                    n     = css.charCodeAt(next + 1);

                    if ( code === CLOSE_CURLY ) {
                        deep -= 1;
                    } else if ( code === HASH && n === OPEN_CURLY ) {
                        deep += 1;
                    }
                }

                content = css.slice(pos, next + 1);
                lines   = content.split('\n');
                last    = lines.length - 1;

                if ( last > 0 ) {
                    nextLine   = line + last;
                    nextOffset = next - lines[last].length;
                } else {
                    nextLine   = line;
                    nextOffset = offset;
                }

                tokens.push(['word', content,
                    line,     pos  - offset,
                    nextLine, next - nextOffset
                ]);

                offset = nextOffset;
                line   = nextLine;
                pos    = next;

            } else if ( code === SLASH && n === ASTERICK ) {
            // } SCSS PATCH

                next = css.indexOf('*/', pos + 2) + 1;
                if ( next === 0 ) {
                    if ( ignore ) {
                        next = css.length;
                    } else {
                        unclosed('comment');
                    }
                }

                content = css.slice(pos, next + 1);
                lines   = content.split('\n');
                last    = lines.length - 1;

                if ( last > 0 ) {
                    nextLine   = line + last;
                    nextOffset = next - lines[last].length;
                } else {
                    nextLine   = line;
                    nextOffset = offset;
                }

                tokens.push(['comment', content,
                    line,     pos  - offset,
                    nextLine, next - nextOffset
                ]);

                offset = nextOffset;
                line   = nextLine;
                pos    = next;

            // SCSS PATCH {
            } else if ( code === SLASH && n === SLASH ) {
                RE_NEW_LINE.lastIndex = pos + 1;
                RE_NEW_LINE.test(css);
                if ( RE_NEW_LINE.lastIndex === 0 ) {
                    next = css.length - 1;
                } else {
                    next = RE_NEW_LINE.lastIndex - 2;
                }

                content = css.slice(pos, next + 1);

                tokens.push(['comment', content,
                    line, pos  - offset,
                    line, next - offset,
                    'inline'
                ]);

                pos = next;
            // } SCSS PATCH

            } else {
                RE_WORD_END.lastIndex = pos + 1;
                RE_WORD_END.test(css);
                if ( RE_WORD_END.lastIndex === 0 ) {
                    next = css.length - 1;
                } else {
                    next = RE_WORD_END.lastIndex - 2;
                }

                tokens.push(['word', css.slice(pos, next + 1),
                    line, pos  - offset,
                    line, next - offset
                ]);
                pos = next;
            }

            break;
        }

        pos++;
    }

    return tokens;
}
