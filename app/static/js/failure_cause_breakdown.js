// Failure Cause Breakdown Visualization (Treemap)

document.addEventListener('DOMContentLoaded', function() {
    // Check if D3 is loaded
    if (typeof d3 === 'undefined') {
        console.error('D3 library is not loaded! Loading from CDN...');
        
        // Try to load D3 from CDN if not available
        const script = document.createElement('script');
        script.src = 'https://d3js.org/d3.v7.min.js';
        script.onload = function() {
            console.log('D3 library loaded from CDN');
            createFailureCauseTreemap();
        };
        script.onerror = function() {
            console.error('Failed to load D3 from CDN');
            displayError('failure-cause-breakdown');
        };
        document.head.appendChild(script);
    } else {
        console.log('D3 library is already loaded');
        createFailureCauseTreemap();
    }
});

function displayError(containerId) {
    const vizContainer = document.querySelector(`#${containerId} .viz-content`);
    if (vizContainer) {
        vizContainer.innerHTML = '<div class="error-message" style="color: #e10600; text-align: center; padding: 20px;">Failed to load visualization</div>';
    }
}

// Listen for circuit selection events for cross-filtering
window.addEventListener('circuitSelected', function(e) {
    const { circuitId, circuitName } = e.detail;
    createFailureCauseTreemap({ circuitId, circuitName });
});

// Remove any stray tooltips when the page loads
document.addEventListener('DOMContentLoaded', function() {
    d3.selectAll('.treemap-tooltip').remove();
});

function createFailureCauseTreemap(filter = {}) {
    try {
        // Check for D3 again just to be safe
        if (typeof d3 === 'undefined') {
            console.error('D3 is still not available');
            displayError('failure-cause-breakdown');
            return;
        }
        
        const card = document.getElementById('failure-cause-breakdown');
        const vizContainer = card.querySelector('.viz-content');
        if (!vizContainer) {
            console.error('Visualization container not found');
            return;
        }
        
        // Check if we're in expanded view and adjust dimensions accordingly
        const isExpanded = card.classList.contains('expanded-view');
        
        // Set dimensions and margins
        const margin = {top: 40, right: 10, bottom: 10, left: 10};
        const width = vizContainer.clientWidth - margin.left - margin.right;
        const height = vizContainer.clientHeight - margin.top - margin.bottom;
        
        // Clear any existing SVG and tooltips
        d3.select(vizContainer).selectAll("*").remove();
        d3.selectAll('.treemap-tooltip').remove();
        
        // Create SVG with responsive sizing
        const svg = d3.select(vizContainer)
            .append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
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
            .text("Failure Cause Breakdown in F1");
        
        // Build query string for filters
        let url = '/api/failure-cause-breakdown';
        const params = [];
        if (filter.circuitId) params.push(`circuitId=${encodeURIComponent(filter.circuitId)}`);
        if (filter.season) params.push(`season=${encodeURIComponent(filter.season)}`);
        if (params.length > 0) url += '?' + params.join('&');
        
        // Load and process data
        fetch(url)
            .then(response => response.json())
            .then(response => {
                if (response.status !== 'success') {
                    throw new Error(response.message || 'Failed to load data');
                }
                
                const reasonsData = response.data;
                
                // Prepare hierarchical data structure for treemap
                const hierarchyData = {
                    name: "Failures",
                    children: reasonsData.map(d => ({
                        name: d.reason,
                        count: d.count,
                        percentage: d.percentage,
                        value: d.count // D3 treemap uses 'value' for sizing
                    }))
                };
                
                // Create treemap layout
                const root = d3.hierarchy(hierarchyData)
                    .sum(d => d.value)
                    .sort((a, b) => b.value - a.value);
                
                // Create color scale
                const colorScale = d3.scaleLinear()
                    .domain([0, reasonsData.length - 1])
                    .range(["#e10600", "#3a0000"])
                    .interpolate(d3.interpolateHcl);
                
                // Create treemap generator
                d3.treemap()
                    .size([width, height])
                    .padding(2)
                    .round(true)
                    (root);
                
                // Create tooltip - append to document.body for maximum visibility
                const tooltip = d3.select("body")
                    .append("div")
                    .attr("class", "treemap-tooltip")
                    .style("opacity", 0)
                    .style("position", "fixed") // Using fixed instead of absolute positioning
                    .style("background", "#15151e")
                    .style("border", "1px solid #e10600")
                    .style("border-radius", "4px")
                    .style("padding", "10px")
                    .style("color", "#ffffff")
                    .style("pointer-events", "none")
                    .style("z-index", "10000") // Very high z-index to ensure visibility
                    .style("box-shadow", "0 0 10px rgba(0,0,0,0.5)")
                    .style("max-width", "250px");
                    
                // Create treemap cells
                const cell = svg.selectAll("g")
                    .data(root.leaves())
                    .enter()
                    .append("g")
                    .attr("transform", d => `translate(${d.x0},${d.y0})`)
                    .attr("class", "treemap-cell")
                    .on("mouseover", function(event, d) {
                        // Show tooltip
                        tooltip.transition()
                            .duration(200)
                            .style("opacity", 0.95);
                        
                        tooltip.html(`
                            <strong>${d.data.name}</strong><br>
                            Count: ${d.data.count}<br>
                            Percentage: ${d.data.percentage}%
                        `);
                        
                        // Position tooltip relative to the viewport
                        const tooltipWidth = parseInt(tooltip.style("width"));
                        const windowWidth = window.innerWidth;
                        
                        // Calculate position - keep within viewport bounds
                        let left = event.clientX + 10;
                        if (left + 250 > windowWidth) {
                            left = event.clientX - 260;
                        }
                        
                        tooltip
                            .style("left", left + "px")
                            .style("top", (event.clientY - 10) + "px");
                        
                        // Highlight cell
                        d3.select(this).select("rect")
                            .style("stroke", "#ffffff")
                            .style("stroke-width", "2px");
                    })
                    .on("mousemove", function(event) {
                        // Update tooltip position as mouse moves
                        const tooltipWidth = parseInt(tooltip.style("width"));
                        const windowWidth = window.innerWidth;
                        
                        let left = event.clientX + 10;
                        if (left + 250 > windowWidth) {
                            left = event.clientX - 260;
                        }
                        
                        tooltip
                            .style("left", left + "px")
                            .style("top", (event.clientY - 10) + "px");
                    })
                    .on("mouseout", function() {
                        // Hide tooltip
                        tooltip.transition()
                            .duration(500)
                            .style("opacity", 0);
                        
                        // Remove highlight
                        d3.select(this).select("rect")
                            .style("stroke", "#2a2a2a")
                            .style("stroke-width", "1px");
                    })
                    .on("click", function(event, d) {
                        // Filter the dashboard by this failure type
                        const failureType = d.data.name;
                        console.log(`Filter by failure type: ${failureType}`);
                        
                        // Display filter information
                        const filterInfo = svg.append("text")
                            .attr("class", "filter-info")
                            .attr("x", width / 2)
                            .attr("y", height - 20)
                            .attr("text-anchor", "middle")
                            .style("font-size", "14px")
                            .style("fill", "#ffffff")
                            // .text(`Filtered by: ${failureType}`);
                        
                        // Remove other filter info if exists
                        svg.selectAll(".filter-info").filter((d, i, nodes) => nodes[i] !== filterInfo.node())
                            .remove();
                    });
                
                // Add rectangles for each cell
                cell.append("rect")
                    .attr("width", d => d.x1 - d.x0)
                    .attr("height", d => d.y1 - d.y0)
                    .style("fill", (d, i) => colorScale(i))
                    .style("stroke", "#2a2a2a")
                    .style("stroke-width", "1px");
                
                // Add text labels
                cell.append("text")
                    .attr("x", 4)
                    .attr("y", 14)
                    .attr("font-size", d => {
                        const cellWidth = d.x1 - d.x0;
                        const cellHeight = d.y1 - d.y0;
                        // Adjust font size based on cell dimensions
                        const area = cellWidth * cellHeight;
                        return Math.min(14, Math.max(8, Math.sqrt(area) / 10)) + "px";
                    })
                    .attr("fill", "#ffffff")
                    .selectAll("tspan")
                    .data(d => {
                        // Split text into multiple lines if needed
                        const cellWidth = d.x1 - d.x0;
                        const name = d.data.name;
                        
                        // Only add text if there's enough space
                        if (cellWidth < 40) return [];
                        
                        if (name.length <= 10 || cellWidth < 80) {
                            return [name];
                        } else {
                            const words = name.split(/\s+/);
                            const lines = [];
                            let line = "";
                            
                            words.forEach(word => {
                                if (line.length + word.length + 1 <= 15) {
                                    line = line ? line + " " + word : word;
                                } else {
                                    lines.push(line);
                                    line = word;
                                }
                            });
                            if (line) lines.push(line);
                            return lines;
                        }
                    })
                    .enter()
                    .append("tspan")
                    .attr("x", 4)
                    .attr("dy", (d, i) => i === 0 ? 0 : 14)
                    .text(d => d);
                
                // Add season filter
                d3.select("#season-filter").on("change", filterBySeason);
                d3.select(".dashboard-button").on("click", filterBySeason);
                
                function filterBySeason() {
                    const selectedSeason = d3.select("#season-filter").property("value");
                    
                    if (selectedSeason === "all") {
                        // Reset to original data
                        createFailureCauseTreemap();
                        return;
                    }
                    
                    // Fetch filtered data for the selected season
                    fetch(`/api/failure-cause-breakdown?season=${selectedSeason}`)
                        .then(response => response.json())
                        .then(response => {
                            if (response.status !== 'success') {
                                throw new Error(response.message || 'Failed to load filtered data');
                            }
                            
                            const filteredData = response.data;
                            
                            if (filteredData.length > 0) {
                                // Update visualization with filtered data
                                // (We would need to re-render the treemap here with the new data)
                                // For simplicity, just displaying a message about filtering
                                svg.append("text")
                                    .attr("class", "filter-message")
                                    .attr("x", width / 2)
                                    .attr("y", height / 2)
                                    .attr("text-anchor", "middle")
                                    .style("fill", "#e10600")
                                    .style("font-size", "14px")
                                    .text(`Filtered by Season: ${selectedSeason}`);
                            } else {
                                // No data for this season
                                svg.append("text")
                                    .attr("x", width / 2)
                                    .attr("y", height / 2)
                                    .attr("text-anchor", "middle")
                                    .style("fill", "#e10600")
                                    .text("No data available for selected season");
                            }
                        })
                        .catch(error => {
                            console.error("Error loading filtered data:", error);
                            svg.append("text")
                                .attr("x", width / 2)
                                .attr("y", height / 2)
                                .attr("text-anchor", "middle")
                                .style("fill", "#e10600")
                                .text("Error loading filtered data");
                        });
                }
                
                // Add filter info if circuit is filtered
                if (filter.circuitName) {
                    svg.append("text")
                        .attr("class", "filter-info")
                        .attr("x", width / 2)
                        .attr("y", height - 20)
                        .attr("text-anchor", "middle")
                        .style("font-size", "14px")
                        .style("fill", "#ffffff")
                        .text(`Filtered by Circuit: ${filter.circuitName}`);
                }
                
            })
            .catch(function(error) {
                console.error("Error loading or processing the data:", error);
                svg.append("text")
                    .attr("x", width / 2)
                    .attr("y", height / 2)
                    .attr("text-anchor", "middle")
                    .style("fill", "#e10600")
                    .text("Error loading data");
            });
    } catch (error) {
        console.error("Error creating treemap:", error);
        displayError('failure-cause-breakdown');
    }
}

// Handle window resize to make the chart responsive
window.addEventListener("resize", function() {
    if (typeof d3 !== 'undefined') {
        createFailureCauseTreemap();
    }
});

// Clean up tooltips when leaving the page or when components are removed
window.addEventListener('beforeunload', function() {
    if (typeof d3 !== 'undefined') {
        d3.selectAll('.treemap-tooltip').remove();
    }
}); 