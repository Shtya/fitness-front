// components/UI/Charts/ProgressChart.js
import { useEffect, useRef } from 'react';
import AOS from 'aos';

export default function ProgressChart({ data, metric, metricName, unit }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    AOS.init({ duration: 800 });
  }, []);

  useEffect(() => {
    if (!canvasRef.current || !data.length) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Calculate scales
    const values = data.map(item => item[metric]);
    const maxValue = Math.max(...values) * 1.1;
    const minValue = Math.min(...values) * 0.9;

    const xScale = width / (data.length - 1);
    const yScale = height / (maxValue - minValue);

    // Draw grid lines
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    
    // Horizontal grid lines
    for (let i = 0; i <= 5; i++) {
      const y = height - (i * height / 5);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw data line
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3;
    ctx.beginPath();

    data.forEach((item, index) => {
      const x = index * xScale;
      const y = height - ((item[metric] - minValue) * yScale);
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw data points
    ctx.fillStyle = '#3b82f6';
    data.forEach((item, index) => {
      const x = index * xScale;
      const y = height - ((item[metric] - minValue) * yScale);
      
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Draw labels
    ctx.fillStyle = '#6b7280';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    
    // X-axis labels (dates)
    data.forEach((item, index) => {
      if (index % Math.ceil(data.length / 5) === 0) {
        const x = index * xScale;
        const date = new Date(item.date).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        });
        ctx.fillText(date, x, height + 20);
      }
    });

    // Y-axis labels (values)
    for (let i = 0; i <= 5; i++) {
      const value = minValue + (i * (maxValue - minValue) / 5);
      const y = height - (i * height / 5);
      ctx.textAlign = 'right';
      ctx.fillText(value.toFixed(1) + unit, -10, y + 4);
    }

  }, [data, metric, unit]);

  if (!data.length) {
    return (
      <div className="text-center py-8 text-gray-500" data-aos="fade-up">
        No data available for chart
      </div>
    );
  }

  return (
    <div data-aos="fade-up">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800">{metricName} Progress Over Time</h3>
      </div>
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={600}
          height={300}
          className="w-full h-48 border border-gray-200 rounded-lg"
        />
      </div>
      <div className="mt-4 text-sm text-gray-600">
        Showing progress from {new Date(data[0].date).toLocaleDateString()} to{' '}
        {new Date(data[data.length - 1].date).toLocaleDateString()}
      </div>
    </div>
  );
}