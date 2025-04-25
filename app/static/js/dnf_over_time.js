// DNFs Over Time Visualization

// Wait for document and D3 to be ready
document.addEventListener('DOMContentLoaded', function() {
    // Check if D3 is loaded
    if (typeof d3 === 'undefined') {
        console.error('D3 library is not loaded! Loading from CDN...');
        
        // Try to load D3 from CDN if not available
        const script = document.createElement('script');
        script.src = 'https://d3js.org/d3.v7.min.js';
        script.onload = function() {
            console.log('D3 library loaded from CDN');
            createDNFsOverTimeChart();
        };
        script.onerror = function() {
            console.error('Failed to load D3 from CDN');
            displayError();
        };
        document.head.appendChild(script);
    } else {
        console.log('D3 library is already loaded');
        createDNFsOverTimeChart();
    }
});

function displayError() {
    const vizContainer = document.querySelector('#dnfs-over-time .viz-content');
    if (vizContainer) {
        vizContainer.innerHTML = '<div class="error-message" style="color: #e10600; text-align: center; padding: 20px;">Failed to load D3 visualization library</div>';
    }
}

function createDNFsOverTimeChart() {
    try {
        // Check for D3 again just to be safe
        if (typeof d3 === 'undefined') {
            console.error('D3 is still not available');
            displayError();
            return;
        }
        
        const card = document.getElementById('dnfs-over-time');
        const vizContainer = card.querySelector('.viz-content');
        if (!vizContainer) {
            console.error('Visualization container not found');
            return;
        }
        
        // Check if we're in expanded view and adjust dimensions accordingly
        const isExpanded = card.classList.contains('expanded-view');
        
        // Set dimensions and margins
        const margin = {top: 40, right: 80, bottom: 60, left: 60};
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
            
        // Add title - larger font if expanded
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", -margin.top / 2)
            .attr("text-anchor", "middle")
            .style("font-size", isExpanded ? "20px" : "16px")
            .style("font-weight", "bold")
            .style("fill", "#ffffff")
            .text("DNFs Over Time in F1 History");
        
        // Load and process data
        d3.csv("/static/data/sampled.csv").then(function(data) {
            // Group data by year and count DNFs
            const dnfsByYear = d3.rollup(
                data,
                v => v.length, // Count of DNFs
                d => d.year    // Group by year
            );
            
            // Convert map to array for easier use with D3
            const yearCounts = Array.from(dnfsByYear, ([year, count]) => ({year: +year, count: count}));
            
            // Sort by year
            yearCounts.sort((a, b) => a.year - b.year);
            
            // Find most common failure reason per year
            const failureReasonsByYear = d3.rollup(
                data,
                v => {
                    // Count occurrences of each reason
                    const reasons = d3.rollup(v, g => g.length, d => d.reasonRetired);
                    // Find the most common reason
                    let maxReason = "";
                    let maxCount = 0;
                    reasons.forEach((count, reason) => {
                        if (count > maxCount) {
                            maxCount = count;
                            maxReason = reason;
                        }
                    });
                    return maxReason;
                },
                d => d.year
            );
            
            // Add failure reason to yearCounts
            yearCounts.forEach(d => {
                d.topReason = failureReasonsByYear.get(d.year.toString());
            });
            
            // Create scales
            const xScale = d3.scaleLinear()
                .domain(d3.extent(yearCounts, d => d.year))
                .range([0, width]);
            
            const yScale = d3.scaleLinear()
                .domain([0, d3.max(yearCounts, d => d.count) * 1.1]) // Add 10% padding
                .range([height, 0]);
            
            // Create line generator
            const line = d3.line()
                .x(d => xScale(d.year))
                .y(d => yScale(d.count))
                .curve(d3.curveMonotoneX); // Makes the line smoother
            
            // Add X axis
            svg.append("g")
                .attr("class", "x-axis")
                .attr("transform", `translate(0, ${height})`)
                .call(d3.axisBottom(xScale).tickFormat(d3.format("d"))) // Format as integer
                .selectAll("text")
                .style("fill", "#cccccc")
                .style("font-size", "12px");
            
            // Add Y axis
            svg.append("g")
                .call(d3.axisLeft(yScale))
                .selectAll("text")
                .style("fill", "#cccccc")
                .style("font-size", "12px");
            
            // Add axis labels
            svg.append("text")
                .attr("text-anchor", "middle")
                .attr("x", width / 2)
                .attr("y", height + margin.bottom - 10)
                .style("fill", "#cccccc")
                .text("Year");
            
            svg.append("text")
                .attr("text-anchor", "middle")
                .attr("transform", `translate(${-margin.left + 15}, ${height/2}) rotate(-90)`)
                .style("fill", "#cccccc")
                .text("Number of DNFs");
            
            // Add the line path
            svg.append("path")
                .datum(yearCounts)
                .attr("class", "line")
                .attr("fill", "none")
                .attr("stroke", "#e10600") // F1 red color
                .attr("stroke-width", 3)
                .attr("d", line);
            
            // Add dots for each data point
            const dots = svg.selectAll(".dot")
                .data(yearCounts)
                .enter()
                .append("circle")
                .attr("class", "dot")
                .attr("cx", d => xScale(d.year))
                .attr("cy", d => yScale(d.count))
                .attr("r", 5)
                .style("fill", "#ffffff")
                .style("stroke", "#e10600")
                .style("stroke-width", 2);
            
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
            
            // Add hover interactions
            dots.on("mouseover", function(event, d) {
                const [mouseX, mouseY] = d3.pointer(event, vizContainer);
                
                tooltip.transition()
                    .duration(200)
                    .style("opacity", 0.9);
                
                tooltip.html(`
                    <strong>Year:</strong> ${d.year}<br>
                    <strong>Total DNFs:</strong> ${d.count}<br>
                    <strong>Top Failure:</strong> ${d.topReason}
                `)
                .style("left", (mouseX + 10) + "px")
                .style("top", (mouseY - 15) + "px");
                
                d3.select(this)
                    .transition()
                    .attr("r", 8)
                    .style("fill", "#e10600");
            })
            .on("mouseout", function() {
                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
                
                d3.select(this)
                    .transition()
                    .attr("r", 5)
                    .style("fill", "#ffffff");
            });
            
            // Add zoom functionality
            const zoom = d3.zoom()
                .scaleExtent([1, 8])
                .extent([[0, 0], [width, height]])
                .on("zoom", zoomed);
            
            function zoomed(event) {
                // Create new scales
                const newX = event.transform.rescaleX(xScale);
                
                // Update x-axis
                svg.select(".x-axis").call(d3.axisBottom(newX).tickFormat(d3.format("d")));
                
                // Update line
                svg.select(".line")
                    .attr("d", d3.line()
                        .x(d => newX(d.year))
                        .y(d => yScale(d.count))
                        .curve(d3.curveMonotoneX));
                
                // Update dots
                svg.selectAll(".dot")
                    .attr("cx", d => newX(d.year))
                    .attr("cy", d => yScale(d.count));
            }
            
            // Attach zoom handler to SVG
            svg.call(zoom);
            
            // Add filter handling
            d3.select("#season-filter").on("change", filterData);
            d3.select("#team-filter").on("change", filterData);
            d3.select(".dashboard-button").on("click", filterData);
            
            function filterData() {
                const selectedSeason = d3.select("#season-filter").property("value");
                const selectedTeam = d3.select("#team-filter").property("value");
                
                // Apply filters and update visualization
                // This is a placeholder for the actual filtering logic
                // In a real implementation, we would filter the data and redraw the chart
                console.log("Filtering by season:", selectedSeason, "and team:", selectedTeam);
                
                // For demo purposes, just show a message
                if (selectedSeason !== "all" || selectedTeam !== "all") {
                    svg.append("text")
                        .attr("class", "filter-message")
                        .attr("x", width / 2)
                        .attr("y", height / 2)
                        .attr("text-anchor", "middle")
                        .style("fill", "#e10600")
                        .style("font-size", "14px")
                        .text("Filter functionality would be applied here");
                } else {
                    svg.selectAll(".filter-message").remove();
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
        console.error("Error creating chart:", error);
        displayError();
    }
}

// Handle window resize to make the chart responsive
window.addEventListener("resize", function() {
    if (typeof d3 !== 'undefined') {
        createDNFsOverTimeChart();
    }
}); 