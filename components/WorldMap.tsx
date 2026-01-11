import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { feature } from 'topojson-client';
import { MapDataPoint } from '../types';

// Simple geojson url
const WORLD_ATLAS_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

interface Props {
  markers?: MapDataPoint[];
}

const WorldMap: React.FC<Props> = ({ markers = [] }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const projectionRef = useRef<d3.GeoProjection | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);

  // Initialize Map
  useEffect(() => {
    const renderMap = async () => {
      if (!svgRef.current) return;

      try {
        const data = await d3.json(WORLD_ATLAS_URL) as any;
        const countries = feature(data, data.objects.countries);

        const width = svgRef.current.clientWidth;
        const height = svgRef.current.clientHeight;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove(); // Clear previous

        const projection = d3.geoMercator()
          .scale(width / 6.5)
          .translate([width / 2, height / 1.5]);
        
        projectionRef.current = projection;

        const path = d3.geoPath().projection(projection);

        const g = svg.append('g').attr('class', 'map-layer');

        // Draw Countries
        g.selectAll('path')
          .data((countries as any).features)
          .enter()
          .append('path')
          .attr('d', path as any)
          .attr('class', 'fill-terminal-panel stroke-terminal-border stroke-[0.5]')
          .attr('cursor', 'pointer')
          .on('mouseover', function() {
            d3.select(this).attr('class', 'fill-terminal-border stroke-terminal-accent stroke-[0.5] transition-colors duration-300');
          })
          .on('mouseout', function() {
            d3.select(this).attr('class', 'fill-terminal-panel stroke-terminal-border stroke-[0.5] transition-colors duration-300');
          });

        // Create a group for markers
        svg.append('g').attr('class', 'markers-layer');

        setLoading(false);
        setMapReady(true);

      } catch (err) {
        console.error("Map load error:", err);
        setLoading(false);
      }
    };

    renderMap();
    
    // Handle resize
    const handleResize = () => {
       // Simple reload for resize to keep projection correct
       renderMap();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Render Markers when markers prop changes or map is ready
  useEffect(() => {
    if (!mapReady || !svgRef.current || !projectionRef.current) return;

    const svg = d3.select(svgRef.current);
    const markersLayer = svg.select('.markers-layer');
    const projection = projectionRef.current;

    // Data join
    const circles = markersLayer.selectAll('.ping-marker')
      .data(markers, (d: any) => d.id);

    // Remove old
    circles.exit().remove();

    // Add new
    const enter = circles.enter()
      .append('g')
      .attr('class', 'ping-marker')
      .attr('transform', d => {
        const [x, y] = projection([d.lng, d.lat]) || [0, 0];
        return `translate(${x}, ${y})`;
      });

    // 1. Initial Shockwave / Burst (Attention Grabber)
    enter.append('circle')
      .attr('r', 2)
      .attr('fill', 'none')
      .attr('stroke', '#00ff9d')
      .attr('stroke-width', 3)
      .attr('opacity', 1)
      .transition()
      .duration(1500)
      .ease(d3.easeExpOut)
      .attr('r', 40) // Large expansion
      .attr('stroke-width', 0)
      .attr('opacity', 0)
      .remove(); // Clean up after animation

    // 2. Secondary Ripple
    enter.append('circle')
      .attr('r', 2)
      .attr('fill', 'none')
      .attr('stroke', '#00ff9d')
      .attr('stroke-width', 1.5)
      .attr('opacity', 0.8)
      .transition()
      .delay(200)
      .duration(1500)
      .ease(d3.easeExpOut)
      .attr('r', 25)
      .attr('stroke-width', 0)
      .attr('opacity', 0)
      .remove();

    // 3. Inner circle (Solid Anchor)
    enter.append('circle')
      .attr('r', 3)
      .attr('fill', '#00ff9d')
      .attr('class', 'drop-shadow-[0_0_8px_rgba(0,255,157,0.8)]');

    // 4. Outer circle (Persistent Pulse)
    enter.append('circle')
      .attr('r', 3)
      .attr('fill', 'none')
      .attr('stroke', '#00ff9d')
      .attr('stroke-width', 1)
      .attr('class', 'animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] opacity-50');
      
    // Label with entrance animation
    enter.append('text')
      .text(d => d.label)
      .attr('y', -12)
      .attr('text-anchor', 'middle')
      .attr('class', 'text-[8px] fill-terminal-accent font-mono uppercase tracking-wider')
      .attr('opacity', 0)
      .attr('dy', 5) // Start slightly lower
      .transition()
      .duration(600)
      .ease(d3.easeCubicOut)
      .attr('opacity', 1)
      .attr('dy', 0); // Move to final position

  }, [markers, mapReady]);

  return (
    <div className="w-full h-full relative overflow-hidden bg-terminal-bg rounded-lg border border-terminal-border">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center text-terminal-accent font-mono text-xs">
          INITIALIZING GEOSPATIAL MODULE...
        </div>
      )}
      <svg ref={svgRef} className="w-full h-full" />
      <div className="absolute bottom-2 left-2 text-[10px] text-terminal-muted font-mono bg-terminal-bg/80 p-1 border border-terminal-border z-10">
        LIVE_EVENT_TRACKING: {markers.length > 0 ? 'TARGET_LOCKED' : 'SCANNING'}
      </div>
    </div>
  );
};

export default WorldMap;