document.addEventListener('DOMContentLoaded', function() {
    initPCPPlot();
    
    // Add event listener for the expand button to handle resize
    document.querySelector('#pcp-plot .expand-button').addEventListener('click', function() {
        setTimeout(() => {
            const container = document.querySelector('#pcp-plot .viz-content');
            if (container.closest('.expanded-view')) {
                initPCPPlot();
            }
        }, 300);
    });
    
    // Handle window resize
    window.addEventListener('resize', debounce(function() {
        initPCPPlot();
    }, 250));
    
    // Clean up any stray tooltips on page load
    d3.selectAll('.pcp-tooltip').remove();
});

function debounce(func, wait) {
    let timeout;
    return function() {
        const context = this, args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

let selectedCountryFilter = null;

window.addEventListener('countrySelected', function(e) {
    // Set the filter to the selected country from the geo map
    selectedCountryFilter = e.detail.country;
    updatePCPHighlightByCountry();
});

window.addEventListener('resetGeoFilters', function() {
    selectedCountryFilter = null;
    updatePCPHighlightByCountry();
});

function updatePCPHighlightByCountry() {
    d3.selectAll('.pcp-line').style('display', d => {
        if (!selectedCountryFilter) return null;
        return d.country === selectedCountryFilter ? null : 'none';
    });
    // Show/hide reset button
    const btn = document.getElementById('reset-country-filter-btn');
    if (btn) btn.style.display = selectedCountryFilter ? 'block' : 'none';
}

function initPCPPlot() {
    const vizContainer = document.querySelector('#pcp-plot .viz-content');
    const isExpanded = vizContainer.closest('.expanded-view') !== null;
    
    // Set the dimensions and margins of the graph with increased margins for labels
    const margin = {
        top: 60,           // Increased top margin for labels
        right: 80,         // Increased right margin
        bottom: 80,        // Same bottom margin
        left: 80           // Increased left margin
    };
    
    const width = vizContainer.clientWidth - margin.left - margin.right;
    const height = (isExpanded ? vizContainer.clientHeight : 500) - margin.top - margin.bottom;
    
    // Clear any existing content
    vizContainer.innerHTML = '';
    
    // Remove any existing tooltips to avoid duplicates
    d3.selectAll('.pcp-tooltip').remove();
    
    // Create the SVG container with dark theme styling
    const svg = d3.select(vizContainer)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .style("background-color", "#1a1a1a")
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);
    
    // Add loading indicator with theme styling
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'loading';
    loadingDiv.textContent = 'Loading data...';
    loadingDiv.style.color = '#ffffff';
    vizContainer.appendChild(loadingDiv);
    
    // Fetch data from the endpoint
    fetch('/api/pcp-data')
        .then(response => response.json())
        .then(function(data) {
            // Remove loading indicator
            const loadingElement = vizContainer.querySelector('.loading');
            if (loadingElement) {
                loadingElement.remove();
            }
            
            if (data.status !== 'success') {
                throw new Error(data.message || 'Failed to load data');
            }
            
            const pcpData = data.data;
            
            // Define the dimensions to plot and their types - reordered with categorical first
            const dimensions = [
                { name: 'circuitType', type: 'categorical', label: 'Circuit Type' },
                { name: 'reasonRetired', type: 'categorical', label: 'Reason Retired' },
                { name: 'constructor', type: 'categorical', label: 'Constructor' },
                { name: 'engine', type: 'categorical', label: 'Engine' },
                { name: 'tyre', type: 'categorical', label: 'Tyre' },
                { name: 'country', type: 'categorical', label: 'Country' },
                { name: 'year', type: 'numeric', label: 'Year' },
                { name: 'grid', type: 'numeric', label: 'Grid Position' },
                { name: 'laps', type: 'numeric', label: 'Number of Laps' }
            ];
            
            // Create scales for each dimension
            const scales = {};
            dimensions.forEach(dim => {
                if (dim.type === 'numeric') {
                    scales[dim.name] = d3.scaleLinear()
                        .domain(d3.extent(pcpData, d => d[dim.name]))
                        .range([height, 0]);
                } else {
                    const uniqueValues = [...new Set(pcpData.map(d => d[dim.name]))];
                    scales[dim.name] = d3.scalePoint()
                        .domain(uniqueValues)
                        .range([height, 0])
                        .padding(0.5);
                }
            });
            
            // Create color scale with a more vibrant palette
            const colorScale = d3.scaleSequential()
                .domain(d3.extent(pcpData, d => d.year))
                .interpolator(d3.interpolateRdYlBu);
            
            // Create tooltip once and reuse it
            const tooltip = d3.select("body")
                .append("div")
                .attr("class", "pcp-tooltip")
                .style("position", "fixed") // Use fixed instead of absolute for better visibility
                .style("visibility", "hidden")
                .style("background-color", "#2a2a2a")
                .style("color", "#ffffff")
                .style("padding", "10px")
                .style("border", "1px solid #e10600")
                .style("border-radius", "5px")
                .style("box-shadow", "0 2px 8px rgba(0,0,0,0.5)")
                .style("font-size", "14px")
                .style("z-index", "10000") // Very high z-index
                .style("pointer-events", "none")
                .style("max-width", "300px");
            
            // Create a container for the lines that will be behind the axes
            const linesGroup = svg.append("g")
                .attr("class", "lines-group");
                
            // Draw the axes with theme styling
            const g = svg.selectAll(".dimension")
                .data(dimensions)
                .enter().append("g")
                .attr("class", "dimension")
                .attr("transform", (d, i) => `translate(${i * (width / (dimensions.length - 1))}, 0)`)
                .call(d3.drag()
                    .subject(function(event, d) {
                        return {x: d3.select(this).attr("transform").match(/translate\(([^,]+)/)[1]};
                    })
                    .on("start", dragstarted)
                    .on("drag", dragged)
                    .on("end", dragended));
            
            // Add background rectangles for axis labels first
            g.append("rect")
                .attr("x", -75)
                .attr("y", -38)
                .attr("width", 150)  // Width is sufficient for longer labels
                .attr("height", 30)
                .attr("rx", 6)
                .attr("fill", "#1A1A1A")
                .attr("opacity", 0.8);
                
            // Add axis labels with theme styling to match the heading
            g.append("text")
                .attr("text-anchor", "middle")
                .attr("y", -20)
                .attr("x", 0)
                .style("font-weight", "bold")
                .style("fill", "#fff")
                .style("font-size", isExpanded ? "16px" : "14px")  // Slightly reduced font size to fit in the space
                .style("text-transform", "uppercase")
                .style("font-family", "'Roboto', 'Arial', sans-serif")
                .style("letter-spacing", "0.5px")
                .style("pointer-events", "none")
                .style("text-shadow", "0 0 6px rgba(0,0,0,0.8)")
                .text(d => d.label.length > 15 ? d.label.substring(0, 15) + "..." : d.label); // Truncate very long labels
            
            // Draw the lines with enhanced styling - now with curve interpolation
            const line = d3.line()
                .defined(d => !isNaN(d.y))
                .x(d => d.x)
                .y(d => d.y)
                .curve(d3.curveCardinal.tension(0.5)); // Use Cardinal curve with tension parameter
            
            // When drawing lines, add class 'pcp-line' and bind data
            const path = linesGroup.selectAll("path")
                .data(pcpData)
                .enter().append("path")
                .attr("class", "pcp-line")
                .attr("d", d => {
                    const points = dimensions.map(dim => ({
                        x: dimensions.indexOf(dim) * (width / (dimensions.length - 1)),
                        y: scales[dim.name](d[dim.name])
                    }));
                    return line(points);
                })
                .style("fill", "none")
                .style("stroke", d => colorScale(d.year))
                .style("stroke-width", 1.5)  // Slightly increased line width for better visibility
                .style("opacity", 0.5);      // Reduced opacity to help axis text stand out
            
            // Create axes container on top of lines
            const axesGroup = svg.append("g")
                .attr("class", "axes-group");
                
            // Add axis labels and lines with theme styling
            axesGroup.selectAll(".dimension-axis")
                .data(dimensions)
                .enter()
                .append("g")
                .attr("class", "dimension-axis")
                .attr("transform", (d, i) => `translate(${i * (width / (dimensions.length - 1))}, 0)`)
                .each(function(d) {
                    const axis = d.type === 'numeric' ? 
                        d3.axisLeft(scales[d.name]) :
                        d3.axisLeft(scales[d.name])
                            .tickFormat(d => d && d.length > 10 ? d.substring(0, 10) + '...' : d);
                    
                    // Apply the axis
                    const axisGroup = d3.select(this)
                        .call(axis);
                    
                    // Style the axis line
                    axisGroup.select(".domain")
                        .attr("stroke", "#fff")
                        .attr("stroke-width", 1.5);
                    
                    // Style the tick lines to be more visible
                    axisGroup.selectAll(".tick line")
                        .attr("stroke", "#fff")
                        .attr("stroke-width", 1.5)
                        .attr("x2", -4); // Extend tick lines
                    
                    // Style the tick text for maximum visibility
                    axisGroup.selectAll(".tick text")
                        .attr("fill", "#ffffff")
                        .style("font-weight", "bold")
                        .style("font-size", "13px")
                        .style("font-family", "'Roboto', 'Arial', sans-serif")
                        .style("stroke", "#000")  // Add black outline
                        .style("stroke-width", "0.5px")  // Thin outline
                        .style("paint-order", "stroke fill")  // Draw stroke first, then fill
                        .style("text-shadow", "0 0 4px #000, 0 0 4px #000, 0 0 4px #000"); // Multiple shadows for stronger effect
                });
            
            // Add brushing with theme styling
            g.append("g")
                .attr("class", "brush")
                .each(function(d) {
                    const brush = d3.brushY()
                        .extent([[-10, 0], [10, height]])
                        .on("brush", function(event) {
                            if (!event.selection) return;
                            
                            const [y0, y1] = event.selection;
                            const dimension = d3.select(this.parentNode).datum();
                            
                            path.style("display", d => {
                                const value = scales[dimension.name](d[dimension.name]);
                                return value >= y0 && value <= y1 ? null : "none";
                            });
                        });
                    
                    d3.select(this)
                        .call(brush)
                        .call(g => g.selectAll(".selection")
                            .attr("fill", "#4a4a4a")
                            .attr("stroke", "#666"));
                });
            
            // Add tooltips with theme styling and improved visibility
            path.on("mouseover", function(event, d) {
                d3.select(this)
                    .style("stroke-width", 3)
                    .style("opacity", 1)
                    .style("stroke", "#e10600"); // Highlight with brand color
                
                // Format tooltip content
                tooltip.html(`
                    <strong>Year:</strong> ${d.year}<br>
                    <strong>Grid:</strong> ${d.grid}<br>
                    <strong>Laps:</strong> ${d.laps}<br>
                    <strong>Circuit Type:</strong> ${d.circuitType}<br>
                    <strong>Status:</strong> ${d.status}<br>
                    <strong>Reason:</strong> ${d.reasonRetired}<br>
                    <strong>Constructor:</strong> ${d.constructor}<br>
                `);
                
                // Calculate position - keep tooltip within viewport bounds
                const windowWidth = window.innerWidth;
                const windowHeight = window.innerHeight;
                let left = event.clientX + 15;
                let top = event.clientY - 20;
                
                // Check if tooltip would go off-screen to the right
                if (left + 300 > windowWidth) {
                    left = event.clientX - 315;
                }
                
                // Check if tooltip would go off-screen at the bottom
                if (top + 200 > windowHeight) {
                    top = event.clientY - 210;
                }
                
                // Position and show tooltip
                tooltip
                    .style("left", left + "px")
                    .style("top", Math.max(10, top) + "px")
                    .style("visibility", "visible");
            })
            .on("mousemove", function(event) {
                // Update tooltip position when mouse moves
                const windowWidth = window.innerWidth;
                const windowHeight = window.innerHeight;
                let left = event.clientX + 15;
                let top = event.clientY - 20;
                
                // Keep tooltip within viewport bounds
                if (left + 300 > windowWidth) {
                    left = event.clientX - 315;
                }
                
                if (top + 200 > windowHeight) {
                    top = event.clientY - 210;
                }
                
                tooltip
                    .style("left", left + "px")
                    .style("top", Math.max(10, top) + "px");
            })
            .on("mouseout", function() {
                // Restore original line style and hide tooltip
                d3.select(this)
                    .style("stroke-width", 1.5)
                    .style("opacity", 0.5)
                    .style("stroke", d => colorScale(d.year));
                
                tooltip.style("visibility", "hidden");
            });
            
            // Add legend when in expanded view
            if (isExpanded) {
                // Get min and max years for the legend
                const yearExtent = d3.extent(pcpData, d => d.year);
                const minYear = yearExtent[0];
                const maxYear = yearExtent[1];
                
                // Create a gradient for the legend
                const legendWidth = 200;
                const legendHeight = 20;
                
                // Create a group for the legend
                const legendGroup = svg.append("g")
                    .attr("class", "legend")
                    .attr("transform", `translate(${width - legendWidth - 20}, ${height + 40})`);
                
                // Add a title for the legend
                legendGroup.append("text")
                    .attr("x", legendWidth / 2)
                    .attr("y", -10)
                    .attr("text-anchor", "middle")
                    .style("fill", "#fff")
                    .style("font-weight", "bold")
                    .style("font-size", "14px")
                    .style("font-family", "'Roboto', 'Arial', sans-serif")
                    .text("Year");
                
                // Create gradient definition
                const defs = svg.append("defs");
                const linearGradient = defs.append("linearGradient")
                    .attr("id", "year-gradient")
                    .attr("x1", "0%")
                    .attr("y1", "0%")
                    .attr("x2", "100%")
                    .attr("y2", "0%");
                
                // Sample colors from the colorScale for the gradient
                const numStops = 10;
                for (let i = 0; i <= numStops; i++) {
                    const year = minYear + (i / numStops) * (maxYear - minYear);
                    linearGradient.append("stop")
                        .attr("offset", `${i * 100 / numStops}%`)
                        .attr("stop-color", colorScale(year));
                }
                
                // Add the colored rectangle
                legendGroup.append("rect")
                    .attr("width", legendWidth)
                    .attr("height", legendHeight)
                    .style("fill", "url(#year-gradient)")
                    .style("stroke", "#fff")
                    .style("stroke-width", 1);
                
                // Add axis for the legend
                const legendScale = d3.scaleLinear()
                    .domain([minYear, maxYear])
                    .range([0, legendWidth]);
                
                const legendAxis = d3.axisBottom(legendScale)
                    .ticks(5)
                    .tickFormat(d3.format("d")); // Format as integer
                
                legendGroup.append("g")
                    .attr("transform", `translate(0, ${legendHeight})`)
                    .call(legendAxis)
                    .selectAll("text")
                    .style("fill", "#fff")
                    .style("font-weight", "bold")
                    .style("font-size", "12px");
                
                // Style the legend axis
                legendGroup.selectAll(".domain, .tick line")
                    .style("stroke", "#fff")
                    .style("stroke-width", 1);
            }
            
            // Drag functions
            function dragstarted(event, d) {
                d3.select(this).raise().classed("active", true);
            }
            
            function dragged(event, d) {
                const thisElem = d3.select(this);
                const xPos = event.x;
                
                // Update the position of the current axis
                thisElem.attr("transform", `translate(${xPos}, 0)`);
                
                // Also update the corresponding axis in the axesGroup
                axesGroup.selectAll(".dimension-axis")
                    .filter((axis, i) => axis.name === d.name)
                    .attr("transform", `translate(${xPos}, 0)`);
                
                // Determine new order of dimensions based on x positions
                const dimensions_copy = [...dimensions];
                const positions = [];
                
                // Get current positions of all axes
                svg.selectAll(".dimension").each(function(d, i) {
                    const transform = d3.select(this).attr("transform");
                    const x = parseFloat(transform.match(/translate\(([^,]+)/)[1]);
                    positions.push({dim: d, x: x, index: i});
                });
                
                // Sort by x position
                positions.sort((a, b) => a.x - b.x);
                
                // Remap dimensions array based on new positions
                const newDimensions = positions.map(p => p.dim);
                
                // Update the path to reflect the new axis positions
                path.attr("d", d => {
                    const points = [];
                    positions.forEach((p, i) => {
                        points.push({
                            x: p.x,
                            y: scales[p.dim.name](d[p.dim.name])
                        });
                    });
                    return line(points);
                });
            }
            
            function dragended(event, d) {
                d3.select(this).classed("active", false);
                
                // After dragging completes, reorder axes to have even spacing
                const positions = [];
                svg.selectAll(".dimension").each(function(d) {
                    const transform = d3.select(this).attr("transform");
                    const x = parseFloat(transform.match(/translate\(([^,]+)/)[1]);
                    positions.push({dim: d, x: x, elem: this});
                });
                
                // Sort by x position
                positions.sort((a, b) => a.x - b.x);
                
                // Update positions with even spacing
                positions.forEach((p, i) => {
                    const newX = i * (width / (dimensions.length - 1));
                    d3.select(p.elem).attr("transform", `translate(${newX}, 0)`);
                    
                    // Update axis positions too
                    axesGroup.selectAll(".dimension-axis")
                        .filter((axis) => axis.name === p.dim.name)
                        .attr("transform", `translate(${newX}, 0)`);
                });
                
                // Update the paths with the new even spacing
                path.attr("d", d => {
                    const points = [];
                    positions.forEach((p, i) => {
                        const newX = i * (width / (dimensions.length - 1));
                        points.push({
                            x: newX,
                            y: scales[p.dim.name](d[p.dim.name])
                        });
                    });
                    return line(points);
                });
            }

            // After drawing lines, apply country filter if active
            updatePCPHighlightByCountry();
        }).catch(function(error) {
            console.error("Error loading data:", error);
            vizContainer.innerHTML = `<div class="error-message">Failed to load data: ${error.message}</div>`;
        });
}

// Clean up tooltips when the window is about to unload
window.addEventListener('beforeunload', function() {
    d3.selectAll('.pcp-tooltip').remove();
});
