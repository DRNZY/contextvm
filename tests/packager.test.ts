// Copyright 2026 Darnell Dijksteel and Contributors
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest';
import { packDirectory } from '../src/core/packager/budget-packer.js';
import * as path from 'node:path';

describe('BudgetPacker', () => {
  it('packs codebase files within token budget', () => {
    const srcDir = path.resolve(__dirname, '../src');
    const result = packDirectory(srcDir, {
      maxTokens: 5000,
      skeletonizeCode: true,
    });

    expect(result.files.length).toBeGreaterThan(0);
    expect(result.totalTokens).toBeLessThanOrEqual(5000);
    expect(result.budgetTokens).toBe(5000);
  });
});
