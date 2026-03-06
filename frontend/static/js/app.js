/* ═══════════════════════════════════════════════════
   app.js — Dashboard Logic (index.html)
   Handles file upload, analysis API calls, results
   rendering, and the similarity network graph.
   ═══════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

    // ─── DOM References ───
    const dropZone      = document.getElementById('drop-zone');
    const fileInput      = document.getElementById('file-input');
    const fileList       = document.getElementById('file-list');
    const analyzeBtn     = document.getElementById('analyze-btn');
    const btnText        = analyzeBtn.querySelector('.btn-text');
    const btnLoader      = analyzeBtn.querySelector('.btn-loader');
    const progressSec    = document.getElementById('progress-section');
    const progressBar    = document.getElementById('progress-bar');
    const progressText   = document.getElementById('progress-text');
    const resultsSec     = document.getElementById('results-section');
    const resultsBody    = document.getElementById('results-body');
    const filesBadge     = document.getElementById('files-badge');
    const canvas         = document.getElementById('network-canvas');

    let selectedFiles = [];

    // ─── Drag & Drop ───
    ['dragenter', 'dragover'].forEach(evt => {
        dropZone.addEventListener(evt, e => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });
    });
    ['dragleave', 'drop'].forEach(evt => {
        dropZone.addEventListener(evt, e => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
        });
    });

    dropZone.addEventListener('drop', e => {
        const dt = e.dataTransfer;
        handleFiles(dt.files);
    });

    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => handleFiles(fileInput.files));

    function handleFiles(fileListObj) {
        selectedFiles = Array.from(fileListObj);
        renderFileChips();
        analyzeBtn.disabled = selectedFiles.length < 2
            && !selectedFiles.some(f => f.name.endsWith('.zip'));
    }

    function renderFileChips() {
        fileList.innerHTML = '';
        selectedFiles.forEach(f => {
            const chip = document.createElement('span');
            chip.className = 'file-chip';
            chip.textContent = f.name;
            fileList.appendChild(chip);
        });
    }

    // ─── Analyze Button ───
    analyzeBtn.addEventListener('click', async () => {
        if (selectedFiles.length === 0) return;

        // Toggle UI state
        btnText.classList.add('hidden');
        btnLoader.classList.remove('hidden');
        analyzeBtn.disabled = true;
        progressSec.classList.remove('hidden');
        resultsSec.classList.add('hidden');

        // Simulate progress (upload + analysis)
        let progress = 0;
        const progressInterval = setInterval(() => {
            progress = Math.min(progress + Math.random() * 12, 90);
            progressBar.style.width = progress + '%';
        }, 200);

        try {
            const formData = new FormData();
            selectedFiles.forEach(f => formData.append('files', f));

            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            clearInterval(progressInterval);
            progressBar.style.width = '100%';

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || 'Upload failed');
            }

            const data = await res.json();
            progressText.textContent = 'Analysis complete!';

            setTimeout(() => {
                progressSec.classList.add('hidden');
                renderResults(data);
            }, 600);

        } catch (err) {
            clearInterval(progressInterval);
            progressBar.style.width = '0%';
            progressText.textContent = `Error: ${err.message}`;
            progressText.style.color = 'var(--danger)';
        } finally {
            btnText.classList.remove('hidden');
            btnLoader.classList.add('hidden');
            analyzeBtn.disabled = false;
        }
    });

    // ─── Render Results Table ───
    function renderResults(data) {
        resultsSec.classList.remove('hidden');
        filesBadge.textContent = `${data.files.length} files analyzed`;

        resultsBody.innerHTML = '';
        data.results.forEach((r, idx) => {
            const sim = r.similarity;
            let statusClass, statusLabel;
            if (sim >= 70) {
                statusClass = 'status-danger';
                statusLabel = 'FLAGGED';
            } else if (sim >= 40) {
                statusClass = 'status-warning';
                statusLabel = 'REVIEW';
            } else {
                statusClass = 'status-success';
                statusLabel = 'CLEAR';
            }

            // Bar color
            let barColor;
            if (sim >= 70) barColor = 'var(--danger)';
            else if (sim >= 40) barColor = 'var(--warning)';
            else barColor = 'var(--success)';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${idx + 1}</td>
                <td><strong>${r.file_a}</strong></td>
                <td><strong>${r.file_b}</strong></td>
                <td>
                    <div class="sim-bar-wrapper">
                        <span class="sim-value" style="color:${barColor}">${sim.toFixed(1)}%</span>
                        <div class="sim-bar-track">
                            <div class="sim-bar-fill" style="width:${sim}%;background:${barColor}"></div>
                        </div>
                    </div>
                </td>
                <td><span class="status-pill ${statusClass}">${statusLabel}</span></td>
                <td>
                    <div class="action-group">
                        <a href="/compare?a=${encodeURIComponent(r.file_a)}&b=${encodeURIComponent(r.file_b)}"
                           class="btn btn-outline btn-sm">Compare</a>
                        <a href="/api/report?file_a=${encodeURIComponent(r.file_a)}&file_b=${encodeURIComponent(r.file_b)}"
                           class="btn btn-outline btn-sm" target="_blank">PDF</a>
                    </div>
                </td>
            `;
            resultsBody.appendChild(tr);
        });

        // Draw network graph
        drawNetwork(data);
    }

    // ─── Network Graph (Canvas-based) ───
    function drawNetwork(data) {
        const ctx = canvas.getContext('2d');
        const W = canvas.width = canvas.offsetWidth;
        const H = canvas.height = 450;
        ctx.clearRect(0, 0, W, H);

        const files = data.files;
        const results = data.results;
        if (files.length === 0) return;

        // Position nodes in a circle
        const cx = W / 2, cy = H / 2;
        const radius = Math.min(W, H) * 0.34;
        const nodePositions = {};
        files.forEach((f, i) => {
            const angle = (2 * Math.PI * i) / files.length - Math.PI / 2;
            nodePositions[f] = {
                x: cx + radius * Math.cos(angle),
                y: cy + radius * Math.sin(angle),
            };
        });

        // Draw edges
        results.forEach(r => {
            const a = nodePositions[r.file_a];
            const b = nodePositions[r.file_b];
            if (!a || !b) return;

            const sim = r.similarity;
            const alpha = Math.max(0.08, sim / 100);
            const lineWidth = 1 + (sim / 100) * 5;

            let color;
            if (sim >= 70) color = `rgba(255, 77, 106, ${alpha})`;
            else if (sim >= 40) color = `rgba(255, 184, 77, ${alpha})`;
            else color = `rgba(77, 255, 166, ${alpha})`;

            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;
            ctx.stroke();

            // Label on edge midpoint
            if (sim >= 30) {
                const mx = (a.x + b.x) / 2;
                const my = (a.y + b.y) / 2;
                ctx.font = '600 11px Inter, sans-serif';
                ctx.fillStyle = color.replace(alpha.toString(), '0.9');
                ctx.fillText(`${sim.toFixed(0)}%`, mx + 4, my - 4);
            }
        });

        // Draw nodes
        files.forEach(f => {
            const p = nodePositions[f];

            // Glow
            const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 24);
            grad.addColorStop(0, 'rgba(124, 108, 255, 0.35)');
            grad.addColorStop(1, 'rgba(124, 108, 255, 0)');
            ctx.beginPath();
            ctx.arc(p.x, p.y, 24, 0, 2 * Math.PI);
            ctx.fillStyle = grad;
            ctx.fill();

            // Circle
            ctx.beginPath();
            ctx.arc(p.x, p.y, 10, 0, 2 * Math.PI);
            ctx.fillStyle = '#7c6cff';
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.15)';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Label
            ctx.font = '500 12px Inter, sans-serif';
            ctx.fillStyle = '#c8c8e8';
            ctx.textAlign = 'center';
            ctx.fillText(f, p.x, p.y + 26);
        });
    }
});
