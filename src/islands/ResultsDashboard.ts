// ResultsDashboard — 4-tab results dashboard with D3.js
import * as d3 from 'd3';

const container = document.getElementById('results-dashboard');
if (container) {
  const baseUrl = (import.meta as any).env?.BASE_URL || '';

  // Monet palette
  const COLORS = {
    purple: '#7c5cbf',
    cyan: '#2da5b8',
    amber: '#c49a3c',
    muted: '#8888aa',
    lavender: '#c4b5e0',
    grid: 'rgba(196,181,224,0.15)',
    textPrimary: '#1a1a2e',
    textSecondary: '#4a4a6a',
  };

  // Tab system
  const tabs = document.createElement('div');
  tabs.className = 'tab-container';
  const tabNames = ['Scaling Curve', 'SNR Ceiling', 'Per-Type MAE', 'Pred vs True'];
  tabNames.forEach((name, i) => {
    const btn = document.createElement('button');
    btn.className = `tab-btn${i === 0 ? ' active' : ''}`;
    btn.textContent = name;
    btn.dataset.tab = `tab-${i}`;
    btn.addEventListener('click', () => switchTab(i));
    tabs.appendChild(btn);
  });
  container.appendChild(tabs);

  // Tab panels
  const panels: HTMLDivElement[] = [];
  for (let i = 0; i < 4; i++) {
    const panel = document.createElement('div');
    panel.className = `tab-panel${i === 0 ? ' active' : ''}`;
    panel.id = `tab-${i}`;
    container.appendChild(panel);
    panels.push(panel);
  }

  function switchTab(idx: number) {
    tabs.querySelectorAll('.tab-btn').forEach((b, i) => b.classList.toggle('active', i === idx));
    panels.forEach((p, i) => p.classList.toggle('active', i === idx));
  }

  // Load all data
  Promise.all([
    fetch(`${baseUrl}/data/scaling_curve.json`).then(r => r.json()),
    fetch(`${baseUrl}/data/snr_ceiling.json`).then(r => r.json()),
    fetch(`${baseUrl}/data/stellar_type_metrics.json`).then(r => r.json()),
    fetch(`${baseUrl}/data/predictions.json`).then(r => r.json()),
  ]).then(([scalingData, snrData, typeData, predData]) => {
    renderScalingCurve(panels[0], scalingData);
    renderSNRCeiling(panels[1], snrData);
    renderPerType(panels[2], typeData);
    renderScatter(panels[3], predData);
  });

  function createSVG(parent: HTMLElement, aspectRatio = 2) {
    const margin = { top: 30, right: 20, bottom: 45, left: 55 };
    const width = Math.min(800, parent.clientWidth) - margin.left - margin.right;
    const height = width / aspectRatio;

    d3.select(parent).selectAll('svg').remove();
    const svg = d3.select(parent)
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    return { svg, width, height, margin };
  }

  function styleAxis(sel: d3.Selection<any, any, any, any>) {
    sel.selectAll('text').style('fill', COLORS.textSecondary).style('font-size', '11px');
    sel.selectAll('line, path').style('stroke', COLORS.lavender);
  }

  // Tab 1: Scaling Curve
  function renderScalingCurve(parent: HTMLElement, data: any) {
    const { svg, width, height } = createSVG(parent);

    const x = d3.scaleLog().domain([800, 1200000]).range([0, width]);
    const y = d3.scaleLinear().domain([0.25, 0.80]).range([height, 0]);

    // Grid
    svg.append('g').attr('class', 'grid')
      .selectAll('line')
      .data(y.ticks(5))
      .join('line')
      .attr('x1', 0).attr('x2', width)
      .attr('y1', d => y(d)).attr('y2', d => y(d))
      .attr('stroke', COLORS.grid);

    // Axes
    const xAxis = svg.append('g').attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(5, '~s'));
    styleAxis(xAxis);

    const yAxis = svg.append('g').call(d3.axisLeft(y).ticks(6));
    styleAxis(yAxis);

    // Labels
    svg.append('text').attr('x', width / 2).attr('y', height + 38)
      .attr('text-anchor', 'middle').style('fill', COLORS.muted).style('font-size', '12px')
      .text('Training Set Size (N)');

    svg.append('text').attr('transform', 'rotate(-90)').attr('x', -height / 2).attr('y', -42)
      .attr('text-anchor', 'middle').style('fill', COLORS.muted).style('font-size', '12px')
      .text('R²');

    // Lines
    Object.entries(data.models).forEach(([name, model]: [string, any]) => {
      const line = d3.line<number>()
        .x((_, i) => x(model.sizes[i]))
        .y(d => y(d))
        .curve(d3.curveMonotoneX);

      svg.append('path')
        .datum(model.r2)
        .attr('fill', 'none')
        .attr('stroke', model.color)
        .attr('stroke-width', 2.5)
        .attr('d', line);

      // Dots
      svg.selectAll(`.dot-${name}`)
        .data(model.r2)
        .join('circle')
        .attr('cx', (_: any, i: number) => x(model.sizes[i]))
        .attr('cy', (d: number) => y(d))
        .attr('r', 4)
        .attr('fill', model.color)
        .attr('stroke', 'white')
        .attr('stroke-width', 1.5)
        .append('title')
        .text((d: number, i: number) => `${name}: N=${model.sizes[i].toLocaleString()}, R²=${d.toFixed(3)}`);
    });

    // Legend
    const legend = svg.append('g').attr('transform', `translate(${width - 110}, 5)`);
    Object.entries(data.models).forEach(([name, model]: [string, any], i) => {
      const g = legend.append('g').attr('transform', `translate(0, ${i * 20})`);
      g.append('line').attr('x1', 0).attr('x2', 18).attr('y1', 0).attr('y2', 0)
        .attr('stroke', model.color).attr('stroke-width', 2.5);
      g.append('text').attr('x', 24).attr('y', 4)
        .style('fill', COLORS.textSecondary).style('font-size', '11px').text(name);
    });
  }

  // Tab 2: SNR Ceiling
  function renderSNRCeiling(parent: HTMLElement, data: any) {
    const { svg, width, height } = createSVG(parent);

    const x = d3.scaleLog().domain([1.5, 120]).range([0, width]);
    const y = d3.scaleLinear().domain([0.15, 1.02]).range([height, 0]);

    // Grid
    svg.append('g').selectAll('line').data(y.ticks(5)).join('line')
      .attr('x1', 0).attr('x2', width)
      .attr('y1', d => y(d)).attr('y2', d => y(d))
      .attr('stroke', COLORS.grid);

    const xAxis = svg.append('g').attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(6, '~s'));
    styleAxis(xAxis);

    const yAxis = svg.append('g').call(d3.axisLeft(y).ticks(6));
    styleAxis(yAxis);

    svg.append('text').attr('x', width / 2).attr('y', height + 38)
      .attr('text-anchor', 'middle').style('fill', COLORS.muted).style('font-size', '12px')
      .text('Signal-to-Noise Ratio (SNR)');

    svg.append('text').attr('transform', 'rotate(-90)').attr('x', -height / 2).attr('y', -42)
      .attr('text-anchor', 'middle').style('fill', COLORS.muted).style('font-size', '12px')
      .text('R²');

    // Fisher ceiling (dashed)
    const fisherLine = d3.line<number>()
      .x((_, i) => x(data.snr_values[i]))
      .y(d => y(d))
      .curve(d3.curveMonotoneX);

    svg.append('path')
      .datum(data.fisher_ceiling_r2)
      .attr('fill', 'none')
      .attr('stroke', COLORS.cyan)
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '6,3')
      .attr('d', fisherLine);

    // SpecViT
    const specLine = d3.line<number>()
      .x((_, i) => x(data.snr_values[i]))
      .y(d => y(d))
      .curve(d3.curveMonotoneX);

    svg.append('path')
      .datum(data.specvit_r2)
      .attr('fill', 'none')
      .attr('stroke', COLORS.purple)
      .attr('stroke-width', 2.5)
      .attr('d', specLine);

    svg.selectAll('.dot-specvit')
      .data(data.specvit_r2)
      .join('circle')
      .attr('cx', (_: any, i: number) => x(data.snr_values[i]))
      .attr('cy', (d: number) => y(d))
      .attr('r', 4)
      .attr('fill', COLORS.purple)
      .attr('stroke', 'white')
      .attr('stroke-width', 1.5)
      .append('title')
      .text((d: number, i: number) => `SpecViT: SNR=${data.snr_values[i]}, R²=${d.toFixed(3)}`);

    // LightGBM
    const lgbLine = d3.line<number>()
      .x((_, i) => x(data.snr_values[i]))
      .y(d => y(d))
      .curve(d3.curveMonotoneX);

    svg.append('path')
      .datum(data.lightgbm_r2)
      .attr('fill', 'none')
      .attr('stroke', COLORS.amber)
      .attr('stroke-width', 2)
      .attr('d', lgbLine);

    // Annotation: "Within 0.02 R² of ceiling"
    const annotIdx = 2; // SNR=4.6
    const ax = x(data.snr_values[annotIdx]);
    const ay1 = y(data.specvit_r2[annotIdx]);
    const ay2 = y(data.fisher_ceiling_r2[annotIdx]);
    svg.append('line')
      .attr('x1', ax).attr('x2', ax)
      .attr('y1', ay1).attr('y2', ay2)
      .attr('stroke', '#c47a9e')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '2,2');
    svg.append('text')
      .attr('x', ax + 8).attr('y', (ay1 + ay2) / 2 + 4)
      .style('fill', '#c47a9e').style('font-size', '10px')
      .text('gap ~0.02');

    // Legend
    const legend = svg.append('g').attr('transform', `translate(${width - 140}, 5)`);
    [
      { name: 'Fisher Ceiling', color: COLORS.cyan, dash: '6,3' },
      { name: 'SpecViT', color: COLORS.purple, dash: '' },
      { name: 'LightGBM', color: COLORS.amber, dash: '' },
    ].forEach((item, i) => {
      const g = legend.append('g').attr('transform', `translate(0, ${i * 20})`);
      g.append('line').attr('x1', 0).attr('x2', 18).attr('y1', 0).attr('y2', 0)
        .attr('stroke', item.color).attr('stroke-width', 2.5)
        .attr('stroke-dasharray', item.dash);
      g.append('text').attr('x', 24).attr('y', 4)
        .style('fill', COLORS.textSecondary).style('font-size', '11px').text(item.name);
    });
  }

  // Tab 3: Per-Type MAE
  function renderPerType(parent: HTMLElement, data: any) {
    const { svg, width, height } = createSVG(parent, 1.8);

    const stellarTypes = ['giants', 'subgiants', 'dwarfs'];
    const chartData = stellarTypes.map(type => ({
      type,
      specvit: data.specvit[type] || 0,
      lightgbm: data.lightgbm[type] || 0,
    }));

    const x0 = d3.scaleBand().domain(stellarTypes).range([0, width]).padding(0.3);
    const x1 = d3.scaleBand().domain(['specvit', 'lightgbm']).range([0, x0.bandwidth()]).padding(0.08);
    const y = d3.scaleLinear()
      .domain([0, d3.max(chartData, d => Math.max(d.specvit, d.lightgbm))! * 1.15])
      .range([height, 0]);

    // Grid
    svg.append('g').selectAll('line').data(y.ticks(5)).join('line')
      .attr('x1', 0).attr('x2', width)
      .attr('y1', d => y(d)).attr('y2', d => y(d))
      .attr('stroke', COLORS.grid);

    const xAxis = svg.append('g').attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x0).tickFormat(d => {
        const labels: Record<string, string> = { giants: 'Giants', subgiants: 'Subgiants', dwarfs: 'Dwarfs' };
        return labels[d] || d;
      }));
    styleAxis(xAxis);

    const yAxis = svg.append('g').call(d3.axisLeft(y).ticks(5));
    styleAxis(yAxis);

    svg.append('text').attr('transform', 'rotate(-90)').attr('x', -height / 2).attr('y', -42)
      .attr('text-anchor', 'middle').style('fill', COLORS.muted).style('font-size', '12px')
      .text('Mean Absolute Error (MAE)');

    // Bars
    const groups = svg.selectAll('.group')
      .data(chartData)
      .join('g')
      .attr('transform', d => `translate(${x0(d.type)},0)`);

    // SpecViT bars with rounded tops
    groups.append('rect')
      .attr('x', x1('specvit')!)
      .attr('y', d => y(d.specvit))
      .attr('width', x1.bandwidth())
      .attr('height', d => height - y(d.specvit))
      .attr('fill', COLORS.purple)
      .attr('rx', 4)
      .attr('opacity', 0.85);

    // LightGBM bars
    groups.append('rect')
      .attr('x', x1('lightgbm')!)
      .attr('y', d => y(d.lightgbm))
      .attr('width', x1.bandwidth())
      .attr('height', d => height - y(d.lightgbm))
      .attr('fill', COLORS.amber)
      .attr('rx', 4)
      .attr('opacity', 0.85);

    // Value labels
    groups.selectAll('.val')
      .data(d => [
        { x: x1('specvit')!, val: d.specvit, col: COLORS.purple },
        { x: x1('lightgbm')!, val: d.lightgbm, col: COLORS.amber },
      ])
      .join('text')
      .attr('x', d => d.x + x1.bandwidth() / 2)
      .attr('y', d => y(d.val) - 6)
      .attr('text-anchor', 'middle')
      .style('font-size', '11px')
      .style('fill', COLORS.textSecondary)
      .text(d => d.val.toFixed(3));

    // Legend
    const legend = svg.append('g').attr('transform', `translate(${width - 110}, 5)`);
    [
      { name: 'SpecViT', color: COLORS.purple },
      { name: 'LightGBM', color: COLORS.amber },
    ].forEach((item, i) => {
      const g = legend.append('g').attr('transform', `translate(0, ${i * 22})`);
      g.append('rect').attr('width', 14).attr('height', 14).attr('rx', 3)
        .attr('fill', item.color).attr('opacity', 0.85);
      g.append('text').attr('x', 20).attr('y', 11)
        .style('fill', COLORS.textSecondary).style('font-size', '11px').text(item.name);
    });
  }

  // Tab 4: Pred vs True scatter
  function renderScatter(parent: HTMLElement, data: any) {
    const { svg, width, height } = createSVG(parent);

    // Data is array of [true, pred]
    let points: { true_logg: number; pred_logg: number }[] = [];
    if (Array.isArray(data)) {
      points = data.map((d: any) => ({
        true_logg: d.true_logg ?? d[0],
        pred_logg: d.pred_logg ?? d[1],
      }));
    } else if (data.predictions) {
      points = data.predictions;
    } else if (data.true_logg && data.pred_logg) {
      points = data.true_logg.map((t: number, i: number) => ({
        true_logg: t,
        pred_logg: data.pred_logg[i],
      }));
    }

    if (!points.length) {
      parent.innerHTML = '<p style="color:var(--text-muted); padding:2rem;">Scatter data not available.</p>';
      return;
    }

    const extent = [
      Math.min(d3.min(points, d => d.true_logg)!, d3.min(points, d => d.pred_logg)!) - 0.2,
      Math.max(d3.max(points, d => d.true_logg)!, d3.max(points, d => d.pred_logg)!) + 0.2,
    ];

    const x = d3.scaleLinear().domain(extent).range([0, width]);
    const y = d3.scaleLinear().domain(extent).range([height, 0]);

    // Grid
    svg.append('g').selectAll('line').data(y.ticks(5)).join('line')
      .attr('x1', 0).attr('x2', width)
      .attr('y1', d => y(d)).attr('y2', d => y(d))
      .attr('stroke', COLORS.grid);

    const xAxis = svg.append('g').attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(6));
    styleAxis(xAxis);

    const yAxis = svg.append('g').call(d3.axisLeft(y).ticks(6));
    styleAxis(yAxis);

    svg.append('text').attr('x', width / 2).attr('y', height + 38)
      .attr('text-anchor', 'middle').style('fill', COLORS.muted).style('font-size', '12px')
      .text('True log g');

    svg.append('text').attr('transform', 'rotate(-90)').attr('x', -height / 2).attr('y', -42)
      .attr('text-anchor', 'middle').style('fill', COLORS.muted).style('font-size', '12px')
      .text('Predicted log g');

    // 1:1 line
    svg.append('line')
      .attr('x1', x(extent[0])).attr('x2', x(extent[1]))
      .attr('y1', y(extent[0])).attr('y2', y(extent[1]))
      .attr('stroke', COLORS.lavender)
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '6,3');

    // Points (subsample if too many)
    const maxPts = 2000;
    const sample = points.length > maxPts
      ? points.filter((_, i) => i % Math.ceil(points.length / maxPts) === 0)
      : points;

    svg.selectAll('.pt')
      .data(sample)
      .join('circle')
      .attr('cx', d => x(d.true_logg))
      .attr('cy', d => y(d.pred_logg))
      .attr('r', 2.5)
      .attr('fill', COLORS.purple)
      .attr('opacity', 0.35);

    // Title annotation
    svg.append('text')
      .attr('x', 10).attr('y', 14)
      .style('fill', COLORS.textSecondary).style('font-size', '11px')
      .text(`N = ${points.length.toLocaleString()} spectra`);
  }
}
