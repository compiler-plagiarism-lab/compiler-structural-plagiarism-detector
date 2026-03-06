/* ═══════════════════════════════════════════════════
   compare.js — Side-by-Side Comparison Logic
   Fetches comparison data from the backend and
   renders highlighted source code panels.
   ═══════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', async () => {

    // ─── Parse query parameters ───
    const params = new URLSearchParams(window.location.search);
    const fileA = params.get('a');
    const fileB = params.get('b');

    if (!fileA || !fileB) {
        document.getElementById('compare-subtitle').textContent = 'Missing file parameters';
        return;
    }

    // Update header labels
    document.getElementById('label-a').textContent = fileA;
    document.getElementById('label-b').textContent = fileB;
    document.getElementById('panel-title-a').textContent = fileA;
    document.getElementById('panel-title-b').textContent = fileB;
    document.getElementById('compare-subtitle').textContent = `${fileA}  vs  ${fileB}`;

    // ─── PDF download button ───
    document.getElementById('download-pdf-btn').addEventListener('click', () => {
        window.open(`/api/report?file_a=${encodeURIComponent(fileA)}&file_b=${encodeURIComponent(fileB)}`, '_blank');
    });

    // ─── Fetch comparison data ───
    try {
        const res = await fetch(`/api/compare?file_a=${encodeURIComponent(fileA)}&file_b=${encodeURIComponent(fileB)}`);
        if (!res.ok) throw new Error((await res.json()).detail || 'Failed to load comparison');
        const data = await res.json();

        // Set similarity badge
        const simBadge = document.getElementById('sim-badge');
        simBadge.textContent = `${data.similarity.toFixed(1)}%`;
        if (data.similarity >= 70) simBadge.classList.add('high');
        else if (data.similarity >= 40) simBadge.classList.add('medium');
        else simBadge.classList.add('low');

        // Build the set of matched line numbers for fast lookup
        const matchedSetA = buildMatchedLineSet(data.matched_lines_a);
        const matchedSetB = buildMatchedLineSet(data.matched_lines_b);

        // Render code panels
        renderCode('code-a', data.source_a, matchedSetA);
        renderCode('code-b', data.source_b, matchedSetB);

        // Synchronize scrolling between both panels
        const scrollA = document.getElementById('code-scroll-a');
        const scrollB = document.getElementById('code-scroll-b');
        let syncing = false;

        scrollA.addEventListener('scroll', () => {
            if (syncing) return;
            syncing = true;
            scrollB.scrollTop = scrollA.scrollTop;
            syncing = false;
        });

        scrollB.addEventListener('scroll', () => {
            if (syncing) return;
            syncing = true;
            scrollA.scrollTop = scrollB.scrollTop;
            syncing = false;
        });

    } catch (err) {
        document.getElementById('compare-subtitle').textContent = `Error: ${err.message}`;
    }

    // ─── Helpers ───

    /**
     * Convert a list of [start, end] line ranges into a Set of line numbers.
     */
    function buildMatchedLineSet(ranges) {
        const s = new Set();
        if (!ranges) return s;
        for (const [start, end] of ranges) {
            for (let ln = start; ln <= end; ln++) {
                s.add(ln);
            }
        }
        return s;
    }

    /**
     * Render source code into a <code> element with line numbers,
     * highlighting lines that are part of the matched structural blocks.
     */
    function renderCode(elementId, source, matchedSet) {
        const codeEl = document.getElementById(elementId);
        const lines = source.split('\n');
        let html = '';

        lines.forEach((line, idx) => {
            const lineNum = idx + 1;
            const isMatched = matchedSet.has(lineNum);
            const cls = isMatched ? 'code-line matched' : 'code-line';
            // Escape HTML entities in source code
            const safe = escapeHtml(line);
            html += `<div class="${cls}"><span class="line-number">${lineNum}</span><span class="line-content">${safe}</span></div>`;
        });

        codeEl.innerHTML = html;
    }

    /**
     * Simple HTML entity escaping for safe rendering.
     */
    function escapeHtml(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
});
