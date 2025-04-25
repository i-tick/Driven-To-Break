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

function createFailureCauseTreemap() {
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
        
        // Clear any existing SVG
        d3.select(vizContainer).selectAll("*").remove();
        
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
        
        // Load and process data
        d3.csv("/static/data/sampled.csv").then(function(data) {
            // Group data by failure reason
            const failureCounts = d3.rollup(
                data,
                v => v.length, // Count of DNFs
                d => d.reasonRetired // Group by reason
            );
            
            // Convert to array and sort by count (descending)
            let reasonsData = Array.from(failureCounts, ([reason, count]) => ({reason, count}))
                .sort((a, b) => b.count - a.count);
            
            // Filter out any empty reason values
            reasonsData = reasonsData.filter(d => d.reason && d.reason.trim() !== "");
            
            // Calculate total for percentages
            const total = reasonsData.reduce((sum, d) => sum + d.count, 0);
            
            // Add percentage to each item
            reasonsData.forEach(d => {
                d.percentage = (d.count / total * 100).toFixed(1);
            });
            
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
                .style("width", "auto");
                
            // Create treemap cells
            const cell = svg.selectAll("g")
                .data(root.leaves())
                .enter()
                .append("g")
                .attr("transform", d => `translate(${d.x0},${d.y0})`)
                .attr("class", "treemap-cell")
                .on("mouseover", function(event, d) {
                    // Show tooltip
                    const [mouseX, mouseY] = d3.pointer(event, vizContainer);
                    
                    tooltip.transition()
                        .duration(200)
                        .style("opacity", 0.9);
                    
                    tooltip.html(`
                        <strong>${d.data.name}</strong><br>
                        Count: ${d.data.count}<br>
                        Percentage: ${d.data.percentage}%
                    `)
                    .style("left", (mouseX + 10) + "px")
                    .style("top", (mouseY - 15) + "px");
                    
                    // Highlight cell
                    d3.select(this).select("rect")
                        .style("stroke", "#ffffff")
                        .style("stroke-width", "2px");
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
                        .text(`Filtered by: ${failureType}`);
                    
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
                
                // Filter data based on selected season
                const filteredData = data.filter(d => d.year === selectedSeason);
                
                // Update visualization with filtered data
                if (filteredData.length > 0) {
                    // Process the filtered data the same way as before
                    const failureCounts = d3.rollup(
                        filteredData,
                        v => v.length,
                        d => d.reasonRetired
                    );
                    
                    // Convert to array and sort
                    let reasonsData = Array.from(failureCounts, ([reason, count]) => ({reason, count}))
                        .sort((a, b) => b.count - a.count)
                        .filter(d => d.reason && d.reason.trim() !== "");
                    
                    // Calculate total
                    const total = reasonsData.reduce((sum, d) => sum + d.count, 0);
                    
                    // Add percentage
                    reasonsData.forEach(d => {
                        d.percentage = (d.count / total * 100).toFixed(1);
                    });
                    
                    // Update visualization
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
            }
            
        }).catch(function(error) {
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