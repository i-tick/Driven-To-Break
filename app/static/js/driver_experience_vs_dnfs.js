// Driver Experience vs DNFs Visualization (Scatter Plot)

document.addEventListener('DOMContentLoaded', function() {
    // Initialize visualization directly for the driver-experience-vs-dnfs card
    const containerId = 'driver-experience-vs-dnfs';
    const container = document.querySelector(`#${containerId} .viz-content`);
    if (container) {
        createDriverExperienceChart(container.id || containerId);
    }

    // Handle expand button click to refresh visualization
    const expandButton = document.querySelector(`#${containerId} .expand-button`);
    if (expandButton) {
        expandButton.addEventListener('click', function() {
            const card = document.getElementById(containerId);
            card.classList.toggle('expanded-view');
            
            // Refresh the chart after expansion animation completes
            setTimeout(() => {
                const vizContainer = card.querySelector('.viz-content');
                if (vizContainer) {
                    createDriverExperienceChart(vizContainer.id || containerId);
                }
            }, 300);
        });
    }
});

function createDriverExperienceChart(containerId) {
    // Ensure D3 is loaded
    if (!window.d3) {
        console.error('D3.js is not loaded. Loading from CDN...');
        const script = document.createElement('script');
        script.src = 'https://d3js.org/d3.v7.min.js';
        script.onload = () => createDriverExperienceChart(containerId);
        document.head.appendChild(script);
        return;
    }

    // Get the container dimensions
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    // Set up the chart dimensions
    const margin = { top: 40, right: 120, bottom: 60, left: 70 };
    const width = containerWidth - margin.left - margin.right;
    const height = containerHeight - margin.top - margin.bottom;

    // Create the SVG element
    const svg = d3.select(`#${containerId}`)
        .append('svg')
        .attr('width', containerWidth)
        .attr('height', containerHeight)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Add title
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', -margin.top / 2)
        .attr('text-anchor', 'middle')
        .attr('class', 'chart-title')
        .attr('fill', 'white')
        .text('Driver Experience vs DNFs');

    // Loading message
    const loadingText = svg.append('text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .attr('class', 'loading-text')
        .attr('fill', 'white')
        .text('Loading data...');

    // Load and process the data
    d3.csv('/static/data/sampled.csv').then(data => {
        // Calculate driver experience (total races) and DNF ratio
        const driverStats = d3.rollup(data, 
            v => {
                const totalRaces = v.length;
                const dnfRaces = v.filter(d => d.statusId !== "1").length; // StatusId 1 is "Finished"
                return {
                    totalRaces: totalRaces,
                    dnfRatio: dnfRaces / totalRaces,
                    name: v[0].driverRef,
                    team: v[0].constructorRef,
                    dnfRaces: dnfRaces
                };
            },
            d => d.driverId
        );

        // Convert Map to array and filter out drivers with fewer than 5 races
        let points = Array.from(driverStats, ([driverId, stats]) => ({
            driverId,
            ...stats
        })).filter(d => d.totalRaces >= 5);

        // If no data after filtering, show a message
        if (points.length === 0) {
            loadingText.text('No data available for drivers with at least 5 races.');
            return;
        }

        // Remove loading text
        loadingText.remove();

        // Get unique teams for coloring
        const teams = [...new Set(points.map(d => d.team))];

        // Create scales
        const xScale = d3.scaleLinear()
            .domain([0, d3.max(points, d => d.totalRaces) * 1.05])
            .range([0, width]);

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(points, d => d.dnfRatio) * 1.05])
            .range([height, 0]);

        const colorScale = d3.scaleOrdinal()
            .domain(teams)
            .range(d3.schemeCategory10);

        // Apply white color to all chart text
        svg.selectAll('text').attr('fill', 'white');
        
        // Add X axis
        svg.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(xScale).ticks(5))
            .attr('color', 'white')  // Set axis color to white
            .append('text')
            .attr('x', width / 2)
            .attr('y', 40)
            .attr('fill', 'white')
            .attr('text-anchor', 'middle')
            .text('Driver Experience (Number of Races)');

        // Add Y axis
        svg.append('g')
            .call(d3.axisLeft(yScale).ticks(5).tickFormat(d => d3.format('.0%')(d)))
            .attr('color', 'white')  // Set axis color to white
            .append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', -50)
            .attr('x', -height / 2)
            .attr('fill', 'white')
            .attr('text-anchor', 'middle')
            .text('DNF Ratio');

        // Create a tooltip
        const tooltip = d3.select(`#${containerId}`).append('div')
            .attr('class', 'tooltip')
            .style('opacity', 0)
            .style('position', 'absolute')
            .style('background-color', 'rgba(0, 0, 0, 0.8)')
            .style('color', 'white')
            .style('padding', '8px')
            .style('border-radius', '4px')
            .style('pointer-events', 'none')
            .style('z-index', '10');

        // Create a group for all points
        const pointsGroup = svg.append('g')
            .attr('class', 'points-group');

        // Add the scatter plot points
        const points_g = pointsGroup.selectAll('.point')
            .data(points)
            .enter()
            .append('circle')
            .attr('class', 'point')
            .attr('cx', d => xScale(d.totalRaces))
            .attr('cy', d => yScale(d.dnfRatio))
            .attr('r', 6)
            .attr('fill', d => colorScale(d.team))
            .attr('opacity', 0.7)
            .attr('stroke', '#fff')
            .attr('stroke-width', 1)
            .attr('data-team', d => d.team)
            .on('mouseover', function(event, d) {
                d3.select(this)
                    .attr('r', 8)
                    .attr('stroke-width', 2);
                
                tooltip.transition()
                    .duration(200)
                    .style('opacity', .9);
                
                tooltip.html(`
                    <strong>${d.name}</strong><br/>
                    Team: ${d.team}<br/>
                    Experience: ${d.totalRaces} races<br/>
                    DNFs: ${d.dnfRaces} (${(d.dnfRatio * 100).toFixed(1)}%)
                `)
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 28) + 'px');
            })
            .on('mouseout', function() {
                d3.select(this)
                    .attr('r', 6)
                    .attr('stroke-width', 1);
                
                tooltip.transition()
                    .duration(500)
                    .style('opacity', 0);
            });

        // Add brushing functionality
        const brush = d3.brush()
            .extent([[0, 0], [width, height]])
            .on('start brush end', brushed);

        // Append the brush to a separate group to keep it below the circles
        const brushGroup = svg.append('g')
            .attr('class', 'brush')
            .call(brush);

        // Bring the points to the front
        pointsGroup.raise();

        function brushed(event) {
            let selection = event.selection;
            
            // If the brush is active (selection exists)
            if (selection) {
                // Get the selected coordinates
                const [[x0, y0], [x1, y1]] = selection;
                
                // Check each point to see if it falls within the brushed area
                pointsGroup.selectAll('.point').each(function(d) {
                    const cx = xScale(d.totalRaces);
                    const cy = yScale(d.dnfRatio);
                    const isBrushed = (cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1);
                    
                    // Style based on whether the point is brushed
                    d3.select(this).attr('opacity', isBrushed ? 1.0 : 0.3);
                });
            } else {
                // If brush is cleared, reset all points
                pointsGroup.selectAll('.point').attr('opacity', 0.7);
            }
        }

        // Add legend for teams
        const legend = svg.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(${width + 10}, 0)`);

        // Add legend title
        legend.append('text')
            .attr('x', 0)
            .attr('y', -10)
            .attr('fill', 'white')
            .text('Teams')
            .style('font-weight', 'bold');

        // Create a legend item for each team
        const legendItems = legend.selectAll('.legend-item')
            .data(teams)
            .enter()
            .append('g')
            .attr('class', 'legend-item')
            .attr('transform', (d, i) => `translate(0, ${i * 20})`)
            .style('cursor', 'pointer')
            .on('click', function(event, team) {
                // Check if any team is currently filtered (opacity < 1)
                const anyFiltered = pointsGroup.selectAll('.point').nodes().some(node => 
                    d3.select(node).attr('opacity') < 0.7);
                
                if (anyFiltered) {
                    // If filtering is active, check if clicking on the active filter
                    const isCurrentFilter = pointsGroup.selectAll('.point').nodes().some(node => 
                        d3.select(node).attr('data-team') === team && d3.select(node).attr('opacity') === '0.7');
                    
                    if (isCurrentFilter) {
                        // Reset all points if clicking on the active filter
                        pointsGroup.selectAll('.point').attr('opacity', 0.7);
                        legend.selectAll('.legend-item').select('text').style('font-weight', 'normal');
                    } else {
                        // Filter to show only the selected team
                        pointsGroup.selectAll('.point')
                            .attr('opacity', d => d.team === team ? 0.7 : 0.1);
                        
                        // Update legend styles
                        legend.selectAll('.legend-item').select('text')
                            .style('font-weight', d => d === team ? 'bold' : 'normal');
                    }
                } else {
                    // Filter to show only the selected team
                    pointsGroup.selectAll('.point')
                        .attr('opacity', d => d.team === team ? 0.7 : 0.1);
                    
                    // Update legend styles
                    legend.selectAll('.legend-item').select('text')
                        .style('font-weight', d => d === team ? 'bold' : 'normal');
                }
            });

        // Add color box for each team
        legendItems.append('rect')
            .attr('width', 12)
            .attr('height', 12)
            .attr('fill', d => colorScale(d));

        // Add team name
        legendItems.append('text')
            .attr('x', 20)
            .attr('y', 10)
            .attr('fill', 'white')
            .text(d => d);

        // Add brush instructions
        svg.append('text')
            .attr('x', width / 2)
            .attr('y', height + margin.bottom - 10)
            .attr('text-anchor', 'middle')
            .attr('class', 'brush-instructions')
            .attr('fill', 'white')
            .text('Click and drag to highlight clusters of points');

    }).catch(error => {
        console.error('Error loading or processing data:', error);
        loadingText.text('Error loading data. Please try again later.');
    });
}

// Helper function to format driver names from IDs
function formatDriverName(driverId) {
    // Convert hyphenated driver IDs to proper names
    if (!driverId) return "Unknown";
    
    return driverId
        .split('-')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

// Helper function to format team names
function formatTeamName(teamId) {
    // Map of team IDs to display names
    const teamNames = {
        "red-bull": "Red Bull",
        "mercedes": "Mercedes",
        "ferrari": "Ferrari",
        "mclaren": "McLaren",
        "aston-martin": "Aston Martin",
        "alpine": "Alpine",
        "williams": "Williams",
        "alphatauri": "AlphaTauri",
        "alfa-romeo": "Alfa Romeo",
        "haas": "Haas",
        "racing-point": "Racing Point",
        "renault": "Renault",
        "toro-rosso": "Toro Rosso",
        "force-india": "Force India"
    };
    
    return teamNames[teamId] || teamId;
}

// Handle window resize to make the chart responsive
window.addEventListener("resize", function() {
    if (typeof d3 !== 'undefined') {
        createDriverExperienceChart();
    }
}); 