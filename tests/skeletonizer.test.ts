// Copyright 2026 Darnell Dijksteel and Contributors
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest';
import { skeletonizeTypeScript } from '../src/core/skeletonizer/ts.js';
import { skeletonizePython } from '../src/core/skeletonizer/python.js';
import { skeletonizeRust } from '../src/core/skeletonizer/rust.js';
import { skeletonizeGo } from '../src/core/skeletonizer/go.js';

describe('AST Skeletonizer', () => {
  it('skeletonizes TypeScript preserving types and function signatures', () => {
    const tsCode = `
import { Config } from './config';

export interface User {
  id: string;
  name: string;
}

export function calculateMetrics(a: number, b: number): number {
  const result = a * b + 42;
  console.log('debug', result);
  return result;
}
`;
    const result = skeletonizeTypeScript(tsCode);
    expect(result).toContain('export interface User');
    expect(result).toContain('export function calculateMetrics(a: number, b: number): number');
    expect(result).toContain('/* ... implementation truncated by ContextVM ... */');
    expect(result).not.toContain('console.log');
  });

  it('skeletonizes Python preserving classes, defs, and docstrings', () => {
    const pyCode = `
import os
import sys

class DataProcessor:
    """Processor class docstring."""
    def process_item(self, item: dict) -> bool:
        if not item:
            return False
        print("Processing...")
        return True
`;
    const result = skeletonizePython(pyCode);
    expect(result).toContain('class DataProcessor:');
    expect(result).toContain('def process_item(self, item: dict) -> bool:');
    expect(result).toContain('pass  # ... implementation truncated by ContextVM ...');
    expect(result).not.toContain('print("Processing...")');
  });

  it('skeletonizes Rust preserving traits, structs, and fn signatures', () => {
    const rsCode = `
use std::collections::HashMap;

pub struct ServerConfig {
    pub port: u16,
}

pub fn handle_connection(stream: TcpStream) -> Result<()> {
    let mut buffer = [0; 512];
    stream.read(&mut buffer)?;
    Ok(())
}
`;
    const result = skeletonizeRust(rsCode);
    expect(result).toContain('pub struct ServerConfig');
    expect(result).toContain('pub fn handle_connection(stream: TcpStream) -> Result<()>');
    expect(result).toContain('/* ... implementation truncated by ContextVM ... */');
    expect(result).not.toContain('stream.read');
  });

  it('skeletonizes Go preserving package, imports, structs, and funcs', () => {
    const goCode = `
package server

import "net/http"

type Handler struct {
    Port int
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
    w.WriteHeader(200)
    w.Write([]byte("OK"))
}
`;
    const result = skeletonizeGo(goCode);
    expect(result).toContain('package server');
    expect(result).toContain('type Handler struct');
    expect(result).toContain('func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request)');
    expect(result).toContain('/* ... implementation truncated by ContextVM ... */');
    expect(result).not.toContain('w.WriteHeader(200)');
  });
});
