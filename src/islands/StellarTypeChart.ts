// Per-Stellar-Type MAE Bar Chart using D3.js
import * as d3 from 'd3';

interface StellarTypeData {
  specvit: Record<string, number>;
  lightgbm: Record<string, number>;
}

const container = document.getElementById('stellar-type-chart');
if (container) {
  const baseUrl = import.meta.env.BASE_URL;

  // Load data
  fetch(`${baseUrl}/data/stellar_type_metrics.json`)
    .then((resp) => resp.json())
    .then((data: StellarTypeData) => {
      renderChart(data);
    })
    .catch((err) => console.error('Failed to load stellar type data:', err));

  function renderChart(data: StellarTypeData) {
    // Chart dimensions
    const margin = { top: 40, right: 120, bottom: 60, left: 60 };
    const width = Math.min(800, container!.clientWidth) - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    // Clear any existing SVG
    d3.select(container).selectAll('svg').remove();

    // Create SVG
    const svg = d3
      .select(container)
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Prepare data
    const stellarTypes = ['giants', 'subgiants', 'dwarfs'];
    const chartData = stellarTypes.map((type) => ({
      type,
      specvit: data.specvit[type] || 0,
      lightgbm: data.lightgbm[type] || 0,
    }));

    // Scales
    const x0 = d3
      .scaleBand()
      .domain(stellarTypes)
      .range([0, width])
      .padding(0.2);

    const x1 = d3
      .scaleBand()
      .domain(['specvit', 'lightgbm'])
      .range([0, x0.bandwidth()])
      .padding(0.05);

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(chartData, (d) => Math.max(d.specvit, d.lightgbm))! * 1.1])
      .range([height, 0]);

    // Color scale
    const colors = {
      specvit: '#8b5cf6', // Purple (SpecViT brand)
      lightgbm: '#f59e0b', // Amber (baseline)
    };

    // X-axis
    svg
      .append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x0).tickFormat((d) => {
        const labels: Record<string, string> = {
          giants: 'Giants',
          subgiants: 'Subgiants',
          dwarfs: 'Dwarfs',
        };
        return labels[d as string] || d as string;
      }))
      .selectAll('text')
      .style('font-size', '14px')
      .style('fill', '#e2e8f0');

    svg.selectAll('.x-axis line, .x-axis path')
      .style('stroke', '#64748b');

    // Y-axis
    svg
      .append('g')
      .attr('class', 'y-axis')
      .call(d3.axisLeft(y).ticks(5))
      .selectAll('text')
      .style('font-size', '14px')
      .style('fill', '#e2e8f0');

    svg.selectAll('.y-axis line, .y-axis path')
      .style('stroke', '#64748b');

    // Y-axis label
    svg
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2)
      .attr('y', -45)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('fill', '#94a3b8')
      .text('Mean Absolute Error (MAE)');

    // Grouped bars
    const groups = svg
      .selectAll('.stellar-group')
      .data(chartData)
      .join('g')
      .attr('class', 'stellar-group')
      .attr('transform', (d) => `translate(${x0(d.type)},0)`);

    // SpecViT bars
    groups
      .append('rect')
      .attr('x', x1('specvit')!)
      .attr('y', (d) => y(d.specvit))
      .attr('width', x1.bandwidth())
      .attr('height', (d) => height - y(d.specvit))
      .attr('fill', colors.specvit)
      .attr('opacity', 0.8)
      .on('mouseover', function () {
        d3.select(this).attr('opacity', 1);
      })
      .on('mouseout', function () {
        d3.select(this).attr('opacity', 0.8);
      });

    // LightGBM bars
    groups
      .append('rect')
      .attr('x', x1('lightgbm')!)
      .attr('y', (d) => y(d.lightgbm))
      .attr('width', x1.bandwidth())
      .attr('height', (d) => height - y(d.lightgbm))
      .attr('fill', colors.lightgbm)
      .attr('opacity', 0.8)
      .on('mouseover', function () {
        d3.select(this).attr('opacity', 1);
      })
      .on('mouseout', function () {
        d3.select(this).attr('opacity', 0.8);
      });

    // Value labels on bars
    groups
      .selectAll('.value-label')
      .data((d) => [
        { model: 'specvit', value: d.specvit, x: x1('specvit')! },
        { model: 'lightgbm', value: d.lightgbm, x: x1('lightgbm')! },
      ])
      .join('text')
      .attr('class', 'value-label')
      .attr('x', (d) => d.x + x1.bandwidth() / 2)
      .attr('y', (d) => y(d.value) - 5)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('fill', '#e2e8f0')
      .text((d) => d.value.toFixed(3));

    // Legend
    const legend = svg
      .append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${width - 100}, 0)`);

    const legendData = [
      { label: 'SpecViT', color: colors.specvit },
      { label: 'LightGBM', color: colors.lightgbm },
    ];

    legend
      .selectAll('.legend-item')
      .data(legendData)
      .join('g')
      .attr('class', 'legend-item')
      .attr('transform', (_, i) => `translate(0, ${i * 25})`)
      .each(function (d) {
        const item = d3.select(this);

        item
          .append('rect')
          .attr('width', 18)
          .attr('height', 18)
          .attr('fill', d.color)
          .attr('opacity', 0.8);

        item
          .append('text')
          .attr('x', 24)
          .attr('y', 14)
          .style('font-size', '14px')
          .style('fill', '#e2e8f0')
          .text(d.label);
      });

    // Title
    svg
      .append('text')
      .attr('x', width / 2)
      .attr('y', -15)
      .attr('text-anchor', 'middle')
      .style('font-size', '16px')
      .style('font-weight', '600')
      .style('fill', '#06b6d4')
      .text('MAE by Stellar Type: SpecViT vs LightGBM');
  }
}
