// Copyright 2026 Darnell Dijksteel and Contributors
// SPDX-License-Identifier: Apache-2.0

export interface JsonCrushOptions {
  maxArrayItems?: number;
  maxStringLength?: number;
  preserveKeys?: string[];
}

export function crushJson(jsonString: string, options: JsonCrushOptions = {}): string {
  try {
    const data = JSON.parse(jsonString);
    const maxItems = options.maxArrayItems ?? 3;
    const maxStr = options.maxStringLength ?? 120;
    const preserve = new Set(options.preserveKeys ?? ['id', 'name', 'type', 'key', 'error', 'status', 'title']);

    function transform(val: any): any {
      if (val === null || val === undefined) return val;

      if (typeof val === 'string') {
        if (val.length > maxStr) {
          return `${val.substring(0, maxStr)}... [~${val.length} chars total]`;
        }
        return val;
      }

      if (Array.isArray(val)) {
        if (val.length <= maxItems) {
          return val.map(transform);
        }
        const sample = val.slice(0, maxItems).map(transform);
        return [
          ...sample,
          `/* ... ${val.length - maxItems} additional array items omitted by ContextVM ... */`
        ];
      }

      if (typeof val === 'object') {
        const out: Record<string, any> = {};
        for (const [k, v] of Object.entries(val)) {
          if (preserve.has(k) || typeof v !== 'string' || (v as string).length <= maxStr) {
            out[k] = transform(v);
          } else {
            out[k] = `${(v as string).substring(0, maxStr)}... [~${(v as string).length} chars]`;
          }
        }
        return out;
      }

      return val;
    }

    return JSON.stringify(transform(data), null, 2);
  } catch {
    const trimmed = jsonString.trim();
    const jsonMatch = trimmed.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        const maxItems = options.maxArrayItems ?? 3;
        const maxStr = options.maxStringLength ?? 120;
        const preserve = new Set(options.preserveKeys ?? ['id', 'name', 'type', 'key', 'error', 'status', 'title']);

        function transform(val: any): any {
          if (val === null || val === undefined) return val;
          if (typeof val === 'string') {
            if (val.length > maxStr) {
              return `${val.substring(0, maxStr)}... [~${val.length} chars total]`;
            }
            return val;
          }
          if (Array.isArray(val)) {
            if (val.length <= maxItems) return val.map(transform);
            const sample = val.slice(0, maxItems).map(transform);
            return [
              ...sample,
              `/* ... ${val.length - maxItems} additional array items omitted by ContextVM ... */`
            ];
          }
          if (typeof val === 'object') {
            const out: Record<string, any> = {};
            for (const [k, v] of Object.entries(val)) {
              if (preserve.has(k) || typeof v !== 'string' || (v as string).length <= maxStr) {
                out[k] = transform(v);
              } else {
                out[k] = `${(v as string).substring(0, maxStr)}... [~${(v as string).length} chars]`;
              }
            }
            return out;
          }
          return val;
        }

        const crushedPart = JSON.stringify(transform(parsed), null, 2);
        return jsonString.replace(jsonMatch[0], crushedPart);
      } catch {}
    }
    return jsonString;
  }
}
