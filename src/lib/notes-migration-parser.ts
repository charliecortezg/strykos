// Parser para notas técnicas de partido en formato libre:
//   "NombreJugador/posicion [nota] NombreJugador2/posicion2 [nota] ..."
// También tolera líneas sin posición cuando el nombre coincide con un jugador
// conocido del partido (diccionario provisto).

import { normalizeSearch } from './utils';

export type ParsedSegment = {
  rawName: string;
  position: string | null;
  note: string;
};

export type MatchResult = {
  parsed: ParsedSegment;
  playerId: string | null;
  playerFullName: string | null;
  candidates: { id: string; full_name: string }[];
  status: 'ready' | 'review' | 'not_found';
};

export type RosterPlayer = { id: string; full_name: string };

const POSITION_RE =
  /(portero|porter[ao]|arquero|defensa|defensor|lateral|central|delanter[ao]|extremo|medio\s+volante|medio\s+centro|mediocentro|mediocampista|medio|volante|contenci[oó]n|enganche)/i;

// Detecta líneas con "Nombre / posicion" (slash con o sin espacios, posición uno o
// dos tokens). Captura nombre y posición.
const DELIM_RE =
  /(^|\n)\s*([A-ZÁÉÍÓÚÑ][\wáéíóúñÁÉÍÓÚÑ.'-]*(?:\s+[A-Za-záéíóúñÁÉÍÓÚÑ.'-]+){0,3})\s*\/\s*([A-Za-záéíóúñ\/\s]{3,40}?)(?=\s*(?:\n|$))/gm;

export function parseTechnicalNotes(
  text: string,
  roster: RosterPlayer[]
): ParsedSegment[] {
  if (!text || !text.trim()) return [];

  // Encuentra todos los delimitadores con posición.
  const matches: { index: number; length: number; name: string; position: string }[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(DELIM_RE.source, 'gm');
  while ((m = re.exec(text)) !== null) {
    const lead = m[1] ?? '';
    const fullStart = m.index + lead.length;
    const fullLen = m[0].length - lead.length;
    matches.push({
      index: fullStart,
      length: fullLen,
      name: m[2].trim(),
      position: m[3].trim().replace(/\s+/g, ' '),
    });
  }

  // Si no encontramos ninguno, intentamos el fallback: detectar líneas que
  // SOLO contengan un nombre del roster.
  const segments: ParsedSegment[] = [];

  if (matches.length === 0) {
    return fallbackParseByRoster(text, roster);
  }

  for (let i = 0; i < matches.length; i++) {
    const cur = matches[i];
    const next = matches[i + 1];
    const noteStart = cur.index + cur.length;
    const noteEnd = next ? next.index : text.length;
    const note = text.slice(noteStart, noteEnd).trim();
    segments.push({
      rawName: cur.name,
      position: cur.position,
      note,
    });
  }

  // Buscar nombres extra entre segmentos (líneas sin slash que coincidan con roster)
  // que aparezcan en el "note" de un segmento previo y deban separarse.
  const expanded: ParsedSegment[] = [];
  for (const seg of segments) {
    expanded.push(...splitBareRosterMentions(seg, roster));
  }
  return expanded;
}

function fallbackParseByRoster(
  text: string,
  roster: RosterPlayer[]
): ParsedSegment[] {
  const lines = text.split(/\n+/);
  const result: ParsedSegment[] = [];
  let current: ParsedSegment | null = null;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const matched = matchRosterName(line, roster);
    if (matched && line.length <= matched.length + 5) {
      if (current) result.push(current);
      current = { rawName: line, position: null, note: '' };
    } else if (current) {
      current.note = (current.note ? current.note + ' ' : '') + line;
    }
  }
  if (current) result.push(current);
  return result;
}

function splitBareRosterMentions(
  seg: ParsedSegment,
  roster: RosterPlayer[]
): ParsedSegment[] {
  // Si el "note" empieza con varias líneas y la última línea es un nombre del
  // roster sin texto detrás (ej. "Rommel Ruiz\nBuena técnica..."), no la
  // separamos — ya está bien manejado en parseo principal porque DELIM_RE
  // sólo separa con slash. Aquí intentamos detectar nombres "huérfanos" que
  // aparezcan al final del note y arrastren su propia descripción.
  const out: ParsedSegment[] = [seg];
  const lines = seg.note.split(/\n+/);
  if (lines.length < 2) return out;

  const bare: { idx: number; name: string }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (!t || t.length > 40) continue;
    if (POSITION_RE.test(t)) continue;
    const matched = matchRosterName(t, roster);
    if (matched && t.length <= matched.length + 5) {
      bare.push({ idx: i, name: t });
    }
  }
  if (bare.length === 0) return out;

  // Reconstruir: trimmar note del seg original al primer bare encontrado.
  const firstBareIdx = bare[0].idx;
  const newNote = lines.slice(0, firstBareIdx).join(' ').trim();
  const result: ParsedSegment[] = [{ ...seg, note: newNote }];

  for (let b = 0; b < bare.length; b++) {
    const startLine = bare[b].idx + 1;
    const endLine = bare[b + 1] ? bare[b + 1].idx : lines.length;
    const noteText = lines.slice(startLine, endLine).join(' ').trim();
    result.push({
      rawName: bare[b].name,
      position: null,
      note: noteText,
    });
  }
  return result;
}

function matchRosterName(line: string, roster: RosterPlayer[]): string | null {
  const norm = normalizeSearch(line);
  for (const p of roster) {
    const fn = normalizeSearch(p.full_name);
    if (norm === fn) return p.full_name;
    const firstTwo = fn.split(' ').slice(0, 2).join(' ');
    if (norm === firstTwo) return p.full_name;
    const firstName = fn.split(' ')[0];
    if (norm === firstName) return p.full_name;
  }
  return null;
}

export function matchParsedToRoster(
  parsed: ParsedSegment,
  roster: RosterPlayer[]
): MatchResult {
  const target = normalizeSearch(parsed.rawName);
  const targetTokens = target.split(/\s+/).filter(Boolean);
  if (targetTokens.length === 0) {
    return {
      parsed,
      playerId: null,
      playerFullName: null,
      candidates: [],
      status: 'not_found',
    };
  }

  // 1) match exacto full_name
  const exact = roster.filter(
    (p) => normalizeSearch(p.full_name) === target
  );
  if (exact.length === 1) {
    return single(parsed, exact[0]);
  }
  if (exact.length > 1) {
    return {
      parsed,
      playerId: null,
      playerFullName: null,
      candidates: exact,
      status: 'review',
    };
  }

  // 2) match por inicio (primer nombre + segundo token)
  const startsWith = roster.filter((p) => {
    const fn = normalizeSearch(p.full_name);
    return targetTokens.every((t, i) => fn.split(' ')[i] === t);
  });
  if (startsWith.length === 1) return single(parsed, startsWith[0]);
  if (startsWith.length > 1) {
    return {
      parsed,
      playerId: null,
      playerFullName: null,
      candidates: startsWith,
      status: 'review',
    };
  }

  // 3) primer token coincide con cualquier token del jugador
  const firstToken = targetTokens[0];
  const looseFirst = roster.filter((p) => {
    const fn = normalizeSearch(p.full_name).split(/\s+/);
    return fn.includes(firstToken);
  });
  if (looseFirst.length === 1) return single(parsed, looseFirst[0]);
  if (looseFirst.length > 1) {
    // Si tenemos dos tokens, intentamos refinar
    if (targetTokens.length >= 2) {
      const refined = looseFirst.filter((p) => {
        const fn = normalizeSearch(p.full_name);
        return targetTokens.slice(1).some((t) =>
          fn.split(/\s+/).some((w) => w.startsWith(t))
        );
      });
      if (refined.length === 1) return single(parsed, refined[0]);
      if (refined.length > 1) {
        return {
          parsed,
          playerId: null,
          playerFullName: null,
          candidates: refined,
          status: 'review',
        };
      }
    }
    return {
      parsed,
      playerId: null,
      playerFullName: null,
      candidates: looseFirst,
      status: 'review',
    };
  }

  // 4) fuzzy: jugador cuyo nombre contenga el primer token o viceversa
  const fuzzy = roster.filter((p) => {
    const fn = normalizeSearch(p.full_name);
    return fn.includes(firstToken) || firstToken.includes(fn.split(' ')[0]);
  });
  if (fuzzy.length === 1) return single(parsed, fuzzy[0]);
  if (fuzzy.length > 1) {
    return {
      parsed,
      playerId: null,
      playerFullName: null,
      candidates: fuzzy,
      status: 'review',
    };
  }

  return {
    parsed,
    playerId: null,
    playerFullName: null,
    candidates: [],
    status: 'not_found',
  };
}

function single(parsed: ParsedSegment, p: RosterPlayer): MatchResult {
  return {
    parsed,
    playerId: p.id,
    playerFullName: p.full_name,
    candidates: [p],
    status: 'ready',
  };
}
