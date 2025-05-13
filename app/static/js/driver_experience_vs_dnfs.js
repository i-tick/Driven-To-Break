// Driver Experience vs DNFs Visualization (Scatter Plot)

document.addEventListener('DOMContentLoaded', function() {
    // Check if D3 is loaded
    if (typeof d3 === 'undefined') {
        console.error('D3 library is not loaded! Loading from CDN...');
        
        // Try to load D3 from CDN if not available
        const script = document.createElement('script');
        script.src = 'https://d3js.org/d3.v7.min.js';
        script.onload = function() {
            console.log('D3 library loaded from CDN');
            createDriverExperienceChart();
        };
        script.onerror = function() {
            console.error('Failed to load D3 from CDN');
            displayError('driver-experience-vs-dnfs');
        };
        document.head.appendChild(script);
    } else {
        console.log('D3 library is already loaded');
        createDriverExperienceChart();
    }
    
    // Add click listener to the expand button
    setupExpandButtonListener();
    
    // Handle window resize to make the chart responsive
    window.addEventListener('resize', debounce(function() {
        if (typeof d3 !== 'undefined') {
            createDriverExperienceChart();
        }
    }, 250));
});

// Also call createDriverExperienceChart when the window is fully loaded
// This ensures the chart is created when all resources are available
window.addEventListener('load', function() {
    console.log('Window loaded - creating driver experience chart');
    if (typeof d3 !== 'undefined') {
        createDriverExperienceChart();
        
        // Make sure the expand button listener is set up
        setupExpandButtonListener();
    }
});

// Global variable to store selected team filter
let selectedTeamFilter = null;

window.addEventListener('teamSelected', function(e) {
    selectedTeamFilter = e.detail.team;
    createDriverExperienceChart();
});

function displayError(containerId) {
    const vizContainer = document.querySelector(`#${containerId} .viz-content`);
    if (vizContainer) {
        vizContainer.innerHTML = '<div class="error-message" style="color: #e10600; text-align: center; padding: 20px;">Failed to load visualization</div>';
    }
}

// Debounce function to prevent excessive redraws on resize
function debounce(func, wait) {
    let timeout;
    return function() {
        const context = this, args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

function createDriverExperienceChart() {
    try {
        // Check for D3 again just to be safe
        if (typeof d3 === 'undefined') {
            console.error('D3 is still not available');
            displayError('driver-experience-vs-dnfs');
            return;
        }
        
        const card = document.getElementById('driver-experience-vs-dnfs');
        const vizContainer = card.querySelector('.viz-content');
        if (!vizContainer) {
            console.error('Visualization container not found');
            return;
        }
        
        // Check if we're in expanded view and adjust dimensions accordingly
        const isExpanded = card.classList.contains('expanded-view');
        
        // Clear any existing SVG
        d3.select(vizContainer).selectAll("*").remove();
        
        // Set explicit height for the container to ensure proper rendering
        // This is critical for expanded view
        const containerHeight = isExpanded ? Math.max(600, window.innerHeight - 100) : 400;
        vizContainer.style.height = `${containerHeight}px`;
        
        // Set dimensions and margins with adjusted values for better chart appearance
        const margin = {
            top: isExpanded ? 60 : 40, 
            right: isExpanded ? 160 : 120, 
            bottom: isExpanded ? 90 : 60, 
            left: isExpanded ? 90 : 70
        };
        
        // Get current width after the container has been styled
        const containerWidth = vizContainer.clientWidth;
        const width = containerWidth - margin.left - margin.right;
        const height = containerHeight - margin.top - margin.bottom;
        
        
        // Create SVG with responsive sizing - important to set the viewBox correctly
        const svg = d3.select(vizContainer)
            .append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("viewBox", `0 0 ${containerWidth} ${containerHeight}`)
            .append("g")
            .attr("transform", `translate(${margin.left}, ${margin.top})`);
        
        // Add title
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", -margin.top / 2)
            .attr("text-anchor", "middle")
            .style("font-size", isExpanded ? "20px" : "16px")
            .style("font-weight", "bold")
            .style("fill", "#ffffff")
            .text("Driver Experience vs DNFs");
        
        // Loading message
        const loadingText = svg.append("text")
            .attr("x", width / 2)
            .attr("y", height / 2)
            .attr("text-anchor", "middle")
            .style("fill", "#ffffff")
            .text("Loading data...");
        
        // Load and process the data
        d3.csv('/static/data/sampled.csv').then(data => {
            // We need additional data for total races per driver, as our dataset only has DNF races
            // So we'll make an API call to get the total number of races
            fetch('/api/circuit-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            })
            .then(response => {
                // We have access to the DNF data, we can process it
                // First, group by driver to get DNF counts
                const driverDNFs = d3.group(data, d => d.driverId);
                
                // Process the driver stats
                const driverStats = Array.from(driverDNFs, ([driverId, races]) => {
                    const dnfRaces = races.length; // Length is the number of DNF races since our dataset is all DNFs
                    const reasonCounts = d3.rollup(
                        races,
                        v => v.length,
                        d => d.reasonRetired
                    );
                    
                    // Get the most common DNF reason
                    let topReason = "";
                    let maxCount = 0;
                    reasonCounts.forEach((count, reason) => {
                        if (count > maxCount) {
                            maxCount = count;
                            topReason = reason;
                        }
                    });
                    
                    const estimatedTotalRaces = races[0].totalRaceStarts;
                    
                    return {
                        driverId,
                        name: formatDriverName(driverId),
                        team: formatTeamName(races[0].constructorId),
                        dnfRaces: dnfRaces,
                        topReason: topReason,
                        totalRaces: estimatedTotalRaces,
                        dnfRatio: dnfRaces / estimatedTotalRaces
                    };
                }).filter(d => d.dnfRaces >= 3); // Filter to drivers with at least 3 DNFs for meaningful data
                
                // Debug log
                console.log("Driver stats:", driverStats);
                
                // Continue with the chart creation
                let filteredDriverStats = driverStats;
                if (selectedTeamFilter) {
                    filteredDriverStats = driverStats.filter(d => d.team === formatTeamName(selectedTeamFilter));
                }
                createChart(filteredDriverStats);
            })
            .catch(error => {
                console.error("Error fetching additional data:", error);
                // Fallback to just using the DNF data if needed
                loadingText.text('Error fetching additional data. Please try again later.');
            });
            
            function createChart(points) {
                // Remove loading text
                loadingText.remove();
                
                // If no data after filtering, show a message
                if (points.length === 0) {
                    svg.append("text")
                        .attr("x", width / 2)
                        .attr("y", height / 2)
                        .attr("text-anchor", "middle")
                        .style("fill", "#e10600")
                        .text("No data available for drivers with enough races.");
                    return;
                }
                
                // Get unique teams for coloring
                const teams = [...new Set(points.map(d => d.team))];
                
                // Create scales
                const maxTotalRaces = Math.max(...points.map(driver => driver.totalRaces));
                console.log(`Maximum total races: ${maxTotalRaces}`);
                const xScale = d3.scaleLinear()
                    .domain([0, maxTotalRaces*1.05])
                    .range([0, width]);

                
                const yScale = d3.scaleLinear()
                    .domain([0, d3.max(points, d => d.dnfRatio) * 1.05])
                    .range([height, 0]);
                
                const colorScale = d3.scaleOrdinal()
                    .domain(teams)
                    .range(d3.schemeCategory10);
                
                // Create tooltip
                const tooltip = d3.select(vizContainer)
                    .append("div")
                    .attr("class", "tooltip")
                    .style("opacity", 0)
                    .style("position", "absolute")
                    .style("background", "#15151e")
                    .style("border", "1px solid #e10600")
                    .style("border-radius", "4px")
                    .style("padding", "10px")
                    .style("color", "#ffffff")
                    .style("pointer-events", "none")
                    .style("z-index", "10")
                    .style("width", "auto");
                
                // Create a group for all points
                const pointsGroup = svg.append('g')
                    .attr('class', 'points-group');
                
                // Add the scatter plot points
                pointsGroup.selectAll('.point')
                    .data(points)
                    .enter()
                    .append('circle')
                    .attr('class', 'point')
                    .attr('cx', d => xScale(d.totalRaces))
                    .attr('cy', d => yScale(d.dnfRatio))
                    .attr('r', isExpanded ? 8 : 6)
                    .attr('fill', d => colorScale(d.team))
                    .attr('opacity', 0.7)
                    .attr('stroke', '#2a2a2a')
                    .attr('stroke-width', 1)
                    .attr('data-team', d => d.team)
                    .on('mouseover', function(event, d) {
                        // Position tooltip
                        const [mouseX, mouseY] = d3.pointer(event, vizContainer);
                        
                        tooltip.transition()
                            .duration(200)
                            .style('opacity', 0.9);
                        
                        // Format tooltip content
                        tooltip.html(`
                            <strong>${d.name}</strong><br>
                            <strong>Team:</strong> ${d.team}<br>
                            <strong>Experience:</strong> ${d.totalRaces} races<br>
                            <strong>DNFs:</strong> ${d.dnfRaces} (${(d.dnfRatio * 100).toFixed(1)}%)<br>
                            <strong>Top DNF Reason:</strong> ${d.topReason || 'Unknown'}
                        `)
                        .style('left', (mouseX + 10) + 'px')
                        .style('top', (mouseY - 15) + 'px');
                        
                        // Highlight current point
                        d3.select(this)
                            .style('stroke', '#ffffff')
                            .style('stroke-width', '2px');
                    })
                    .on('mouseout', function() {
                        // Hide tooltip
                        tooltip.transition()
                            .duration(500)
                            .style('opacity', 0);
                        
                        // Remove highlight
                        d3.select(this)
                            .style('stroke', '#2a2a2a')
                            .style('stroke-width', '1px');
                    });
                
                // Add X axis
                svg.append('g')
                    .attr('transform', `translate(0,${height})`)
                    .call(d3.axisBottom(xScale).ticks(isExpanded ? 10 : 5))
                    .selectAll('text')
                    .style('fill', '#cccccc')
                    .style('font-size', '12px');
                
                // Add Y axis
                svg.append('g')
                    .call(d3.axisLeft(yScale).ticks(isExpanded ? 10 : 5).tickFormat(d => d3.format('.0%')(d)))
                    .selectAll('text')
                    .style('fill', '#cccccc')
                    .style('font-size', '12px');
                
                // Add X axis label
                svg.append('text')
                    .attr('text-anchor', 'middle')
                    .attr('x', width / 2)
                    .attr('y', height + margin.bottom - 10)
                    .style('fill', '#cccccc')
                    .text('Driver Experience (Number of Races)');
                
                // Add Y axis label
                svg.append('text')
                    .attr('text-anchor', 'middle')
                    .attr('transform', `translate(${-margin.left + 15}, ${height/2}) rotate(-90)`)
                    .style('fill', '#cccccc')
                    .text('DNF Ratio');
                
                // Add legend for teams
                const legendSpacing = isExpanded ? 25 : 20;
                const legend = svg.append('g')
                    .attr('class', 'legend')
                    .attr('transform', `translate(${width + 20}, 0)`)
                    .style('font-size', isExpanded ? '14px' : '12px');
                
                // Add legend title
                legend.append('text')
                    .attr('x', 0)
                    .attr('y', -10)
                    .style('fill', '#ffffff')
                    .text('Teams')
                    .style('font-weight', 'bold');
                
                // Create a legend item for each team
                const legendItems = legend.selectAll('.legend-item')
                    .data(teams)
                    .enter()
                    .append('g')
                    .attr('class', 'legend-item')
                    .attr('transform', (d, i) => `translate(0, ${i * legendSpacing})`)
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
                    .attr('width', isExpanded ? 15 : 12)
                    .attr('height', isExpanded ? 15 : 12)
                    .attr('fill', d => colorScale(d));
                
                // Add team name
                legendItems.append('text')
                    .attr('x', isExpanded ? 25 : 20)
                    .attr('y', isExpanded ? 12 : 10)
                    .style('fill', '#ffffff')
                    .text(d => d);
            }
            
        }).catch(function(error) {
            console.error("Error loading or processing the data:", error);
            loadingText.text("Error loading data. Please try again later.");
        });
        
        // Add reset button
        let resetBtn = document.getElementById('reset-team-filter-btn');
        if (!resetBtn) {
            resetBtn = document.createElement('button');
            resetBtn.id = 'reset-team-filter-btn';
            resetBtn.textContent = 'Reset Team Filter';
            resetBtn.style.margin = '10px 0 10px 10px';
            resetBtn.style.padding = '6px 14px';
            resetBtn.style.background = '#e10600';
            resetBtn.style.color = '#fff';
            resetBtn.style.border = 'none';
            resetBtn.style.borderRadius = '4px';
            resetBtn.style.fontWeight = 'bold';
            resetBtn.style.cursor = 'pointer';
            resetBtn.style.display = 'block';
            resetBtn.onclick = function() {
                selectedTeamFilter = null;
                createDriverExperienceChart();
            };
            vizContainer.parentNode.insertBefore(resetBtn, vizContainer);
        }
        resetBtn.style.display = selectedTeamFilter ? 'block' : 'none';
        
    } catch (error) {
        console.error("Error creating chart:", error);
        displayError('driver-experience-vs-dnfs');
    }
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

// Set up the expand button listener separately to ensure it's always attached
function setupExpandButtonListener() {
    const expandButton = document.querySelector('#driver-experience-vs-dnfs .expand-button');
    if (expandButton) {
        console.log('Setting up expand button listener');
        
        // Remove any existing listeners to prevent duplicates
        const newExpandButton = expandButton.cloneNode(true);
        expandButton.parentNode.replaceChild(newExpandButton, expandButton);
        
        newExpandButton.addEventListener('click', function(event) {
            console.log('Expand button clicked');
            const card = document.getElementById('driver-experience-vs-dnfs');
            card.classList.toggle('expanded-view');
            
            // Prevent event bubbling
            event.stopPropagation();
            
            // Redraw the chart after the transition completes
            setTimeout(() => {
                console.log('Redrawing chart after expansion');
                createDriverExperienceChart();
            }, 300);
        });
    } else {
        console.error('Expand button not found!');
    }
}